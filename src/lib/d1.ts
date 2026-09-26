import { demoEvents, historicalDemoEvent } from "./demo";
import type { EventRow, Source, SystemId, Telemetry } from "./model";

type Query = { sql: string; params?: (string | number | null)[] };
type Result = { results?: Record<string, any>[]; meta?: { last_row_id?: number }; success?: boolean };
let initialized: Promise<void> | undefined;
const insertSql = "INSERT INTO events(source,system,device_id,name,location,recorded_at,received_at,health,note,data_json,position_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)";
function insertQuery(event: Telemetry, source: Source, receivedAt: string): Query { return { sql: insertSql, params: [source, event.system, event.deviceId, event.name, event.location, event.recordedAt, receivedAt, event.health, event.note || null, JSON.stringify(event.data), event.position ? JSON.stringify(event.position) : null] }; }
async function query(body: Query | { batch: Query[] }): Promise<Result[]> {
  const { CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN } = process.env;
  if (!CF_ACCOUNT_ID || !CF_D1_DATABASE_ID || !CF_API_TOKEN) throw new Error("D1 credentials missing: CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN");
  const encode = (item: Query) => ({ ...item, params: item.params?.map(value => value === null ? "" : String(value)) });
  const payload = "batch" in body ? { batch: body.batch.map(encode) } : encode(body);
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}/query`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${CF_API_TOKEN}` }, body: JSON.stringify(payload), cache: "no-store" });
  const json = await response.json() as { success: boolean; result?: Result[]; errors?: { message: string }[] };
  if (!response.ok || !json.success || json.result?.some(r => !r.success)) throw new Error(`D1 query failed: ${json.errors?.map(e => e.message).join(", ") || response.status}`);
  return json.result || [];
}
async function q(sql: string, params: Query["params"] = []) { return (await query({ sql, params }))[0]; }
function rowEvent(row: Record<string, any>): EventRow { return { id: row.id, source: row.source, system: row.system, deviceId: row.device_id, name: row.name, location: row.location, recordedAt: row.recorded_at, receivedAt: row.received_at, health: row.health, note: row.note || undefined, data: JSON.parse(row.data_json), position: row.position_json ? JSON.parse(row.position_json) : undefined } as EventRow; }
async function init() {
  await q(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT,source TEXT NOT NULL,system TEXT NOT NULL,device_id TEXT NOT NULL,name TEXT NOT NULL,location TEXT NOT NULL,recorded_at TEXT NOT NULL,received_at TEXT NOT NULL,health TEXT NOT NULL,note TEXT,data_json TEXT NOT NULL,position_json TEXT);
CREATE INDEX IF NOT EXISTS events_lookup ON events(source,system,device_id,id DESC);
CREATE TABLE IF NOT EXISTS command_audit (id INTEGER PRIMARY KEY AUTOINCREMENT,time TEXT NOT NULL,actor TEXT NOT NULL,system TEXT NOT NULL,device_id TEXT NOT NULL,command TEXT NOT NULL,reason TEXT NOT NULL,result TEXT NOT NULL,detail TEXT);`);
  const columns = await q("PRAGMA table_info(events)");
  if (!columns.results?.some(c => c.name === "position_json")) await q("ALTER TABLE events ADD COLUMN position_json TEXT");
  await q("INSERT OR IGNORE INTO settings(key,value) VALUES('mode','demo')");
  const exists = await q("SELECT 1 FROM events WHERE source='demo' LIMIT 1");
  if (!exists.results?.length) {
    const rows: Query[] = [];
    for (let h = 23; h >= 0; h--) for (const e of demoEvents()) {
      if (h > 5 && e.system !== "environment") continue;
      const historical = historicalDemoEvent(e, h);
      rows.push(insertQuery(historical, "demo", historical.recordedAt));
    }
    await query({ batch: rows });
  }
}
function ready() { return initialized ||= init(); }
export async function getMode(): Promise<Source> { await ready(); return (await q("SELECT value FROM settings WHERE key='mode'")).results?.[0]?.value || "demo"; }
export async function setMode(mode: Source) { await ready(); await q("UPDATE settings SET value=? WHERE key='mode'", [mode]); }
export async function insertEvent(event: Telemetry, source: Source, receivedAt = new Date().toISOString()) { await ready(); return (await q(insertSql, insertQuery(event, source, receivedAt).params)).meta?.last_row_id || 0; }
export async function latest(source: Source): Promise<EventRow[]> { await ready(); return ((await q("SELECT e.* FROM events e JOIN (SELECT device_id,MAX(id) id FROM events WHERE source=? GROUP BY device_id) x ON e.id=x.id ORDER BY e.system,e.device_id", [source])).results || []).map(rowEvent); }
export async function history(system: SystemId, source: Source, limit = 300): Promise<EventRow[]> { await ready(); return ((await q("SELECT * FROM events WHERE system=? AND source=? ORDER BY id DESC LIMIT ?", [system, source, limit])).results || []).map(rowEvent); }
export async function audit(command: { system: string; deviceId: string; command: string; reason: string }, actor: string, result: string, detail = "") { await ready(); await q("INSERT INTO command_audit(time,actor,system,device_id,command,reason,result,detail) VALUES(?,?,?,?,?,?,?,?)", [new Date().toISOString(), actor, command.system, command.deviceId, command.command, command.reason, result, detail]); }
export async function auditHistory() { await ready(); return (await q("SELECT * FROM command_audit ORDER BY id DESC LIMIT 100")).results || []; }
