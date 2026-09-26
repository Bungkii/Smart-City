import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { demoEvents, historicalDemoEvent } from "./demo";
import type { EventRow, Source, SystemId, Telemetry } from "./model";

const location = process.env.DB_PATH || path.join(process.cwd(), "data", "smartcity.db");
let db: Database.Database | undefined;

let stmts: {
  getMode?: Database.Statement;
  setMode?: Database.Statement;
  insertEvent?: Database.Statement;
  latest?: Database.Statement;
  history?: Database.Statement;
  insertAudit?: Database.Statement;
  auditHistory?: Database.Statement;
} = {};

function getDb(): Database.Database {
  if (db) return db;
  fs.mkdirSync(path.dirname(location), { recursive: true });
  db = new Database(location, { timeout: 10000 });
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = -64000");
  db.pragma("mmap_size = 268435456");

  db.exec(`
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, system TEXT NOT NULL, device_id TEXT NOT NULL, name TEXT NOT NULL, location TEXT NOT NULL, recorded_at TEXT NOT NULL, received_at TEXT NOT NULL, health TEXT NOT NULL, note TEXT, data_json TEXT NOT NULL, position_json TEXT);
  CREATE INDEX IF NOT EXISTS events_lookup ON events(source, system, device_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_events_history ON events(system, source, id DESC);
  CREATE INDEX IF NOT EXISTS idx_events_latest ON events(source, device_id, id DESC);
  CREATE TABLE IF NOT EXISTS command_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, time TEXT NOT NULL, actor TEXT NOT NULL, system TEXT NOT NULL, device_id TEXT NOT NULL, command TEXT NOT NULL, reason TEXT NOT NULL, result TEXT NOT NULL, detail TEXT);
`);
  if (!(db.pragma("table_info(events)") as { name: string }[]).some(c => c.name === "position_json")) {
    db.exec("ALTER TABLE events ADD COLUMN position_json TEXT");
  }
  if (!db.prepare("SELECT value FROM settings WHERE key='mode'").get()) {
    db.prepare("INSERT INTO settings(key,value) VALUES('mode','demo')").run();
  }
  if (!(db.prepare("SELECT 1 FROM events WHERE source='demo' LIMIT 1").get())) {
    const seed = db.transaction(() => {
      for (let h = 23; h >= 0; h--) {
        for (const e of demoEvents()) {
          const historical = historicalDemoEvent(e, h);
          insertEvent(historical, "demo", historical.recordedAt);
        }
      }
    });
    seed();
  }

  stmts = {
    getMode: db.prepare("SELECT value FROM settings WHERE key='mode'"),
    setMode: db.prepare("UPDATE settings SET value=? WHERE key='mode'"),
    insertEvent: db.prepare("INSERT INTO events(source,system,device_id,name,location,recorded_at,received_at,health,note,data_json,position_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)"),
    latest: db.prepare("SELECT e.* FROM events e JOIN (SELECT device_id, MAX(id) id FROM events WHERE source=? GROUP BY device_id) x ON e.id=x.id ORDER BY e.system,e.device_id"),
    history: db.prepare("SELECT * FROM events WHERE system=? AND source=? ORDER BY id DESC LIMIT ?"),
    insertAudit: db.prepare("INSERT INTO command_audit(time,actor,system,device_id,command,reason,result,detail) VALUES(?,?,?,?,?,?,?,?)"),
    auditHistory: db.prepare("SELECT * FROM command_audit ORDER BY id DESC LIMIT 100")
  };

  return db;
}

export function getMode(): Source {
  getDb();
  return (stmts.getMode!.get() as { value: Source }).value;
}

export function setMode(mode: Source) {
  getDb();
  stmts.setMode!.run(mode);
}

export function insertEvent(event: Telemetry, source: Source, receivedAt = new Date().toISOString()) {
  getDb();
  return stmts.insertEvent!.run(
    source,
    event.system,
    event.deviceId,
    event.name,
    event.location,
    event.recordedAt,
    receivedAt,
    event.health,
    event.note || null,
    JSON.stringify(event.data),
    event.position ? JSON.stringify(event.position) : null
  ).lastInsertRowid;
}

type Raw = { id: number; source: Source; system: SystemId; device_id: string; name: string; location: string; recorded_at: string; received_at: string; health: "normal" | "warning"; note: string | null; data_json: string; position_json: string | null };

function eventFromRow(row: Raw): EventRow {
  return {
    id: row.id,
    source: row.source,
    system: row.system,
    deviceId: row.device_id,
    name: row.name,
    location: row.location,
    recordedAt: row.recorded_at,
    receivedAt: row.received_at,
    health: row.health,
    note: row.note || undefined,
    data: JSON.parse(row.data_json),
    position: row.position_json ? JSON.parse(row.position_json) : undefined
  } as EventRow;
}

export function latest(source = getMode()): EventRow[] {
  getDb();
  const rows = stmts.latest!.all(source) as Raw[];
  return rows.map(eventFromRow);
}

export function history(system: SystemId, source = getMode(), limit = 60): EventRow[] {
  getDb();
  return (stmts.history!.all(system, source, limit) as Raw[]).map(eventFromRow);
}

export function alerts(source = getMode()) {
  return latest(source)
    .filter(e => e.health === "warning")
    .map(e => ({
      id: e.id,
      deviceId: e.deviceId,
      name: e.name,
      system: e.system,
      note: e.note || (e.system === "environment" ? "ค่าตรวจวัดควรตรวจสอบ" : "อุปกรณ์ต้องตรวจสอบ"),
      time: e.receivedAt
    }));
}

export function audit(command: { system: string; deviceId: string; command: string; reason: string }, actor: string, result: string, detail = "") {
  getDb();
  stmts.insertAudit!.run(new Date().toISOString(), actor, command.system, command.deviceId, command.command, command.reason, result, detail);
}

export function auditHistory() {
  getDb();
  return stmts.auditHistory!.all();
}

let lastSupabaseSync = 0;
export async function syncFromSupabase() {
  const now = Date.now();
  if (now - lastSupabaseSync < 2000) return;
  lastSupabaseSync = now;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/rest/v1/events?source=eq.live&order=id.desc&limit=25`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return;
    const rows = (await res.json()) as Array<{
      id: number;
      source: string;
      system: SystemId;
      device_id: string;
      name: string;
      location: string;
      recorded_at: string;
      received_at: string;
      health: "normal" | "warning";
      note: string | null;
      data_json: any;
      position_json?: any;
    }>;
    if (Array.isArray(rows)) {
      getDb();
      for (const r of rows) {
        const existing = db?.prepare("SELECT id FROM events WHERE source='live' AND device_id=? AND recorded_at=?").get(r.device_id, r.recorded_at);
        if (!existing) {
          insertEvent(
            {
              system: r.system,
              deviceId: r.device_id,
              name: r.name,
              location: r.location,
              recordedAt: r.recorded_at,
              health: r.health,
              note: r.note || undefined,
              data: typeof r.data_json === "string" ? JSON.parse(r.data_json) : r.data_json,
              position: r.position_json ? (typeof r.position_json === "string" ? JSON.parse(r.position_json) : r.position_json) : undefined,
            },
            "live",
            r.received_at
          );
        }
      }
    }
  } catch {
    // Network or parse error handled silently
  }
}

