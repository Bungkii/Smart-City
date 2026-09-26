import { isDeviceEvent } from "./data-integrity";
import * as postgres from "./postgres";
import * as d1 from "./d1";
import type { EventRow, Source, SystemId, Telemetry } from "./model";

const driver = process.env.DB_DRIVER || "postgres";

async function getSqlite() {
  return await import("./db");
}

export async function getMode(): Promise<Source> {
  if (driver === "d1") return d1.getMode();
  if (driver === "sqlite") return (await getSqlite()).getMode();
  return postgres.getMode();
}

export async function setMode(mode: Source): Promise<void> {
  if (driver === "d1") return d1.setMode(mode);
  if (driver === "sqlite") return (await getSqlite()).setMode(mode);
  return postgres.setMode(mode);
}

export async function insertEvent(event: Telemetry, source: Source, receivedAt?: string): Promise<number> {
  if (driver === "d1") return d1.insertEvent(event, source, receivedAt);
  if (driver === "sqlite") return Number((await getSqlite()).insertEvent(event, source, receivedAt));
  return postgres.insertEvent(event, source, receivedAt);
}

async function readLatest(source: Source): Promise<EventRow[]> {
  if (driver === "d1") return d1.latest(source);
  if (driver === "sqlite") return (await getSqlite()).latest(source);
  return postgres.latest(source);
}

async function readHistory(system: SystemId, source: Source, limit?: number): Promise<EventRow[]> {
  if (driver === "d1") return d1.history(system, source, limit);
  if (driver === "sqlite") return (await getSqlite()).history(system, source, limit);
  return postgres.history(system, source, limit);
}

export async function audit(
  command: { system: string; deviceId: string; command: string; reason: string },
  actor: string,
  result: string,
  detail?: string
): Promise<void> {
  if (driver === "d1") return d1.audit(command, actor, result, detail);
  if (driver === "sqlite") return (await getSqlite()).audit(command, actor, result, detail);
  return postgres.audit(command, actor, result, detail);
}

export async function auditHistory(): Promise<any[]> {
  if (driver === "d1") return d1.auditHistory();
  if (driver === "sqlite") return (await getSqlite()).auditHistory();
  return postgres.auditHistory();
}

export async function syncFromSupabase(): Promise<void> {
  if (driver === "sqlite") {
    const sqlite = await getSqlite();
    await sqlite.syncFromSupabase();
  }
}


export async function latest(source: Source): Promise<EventRow[]> {
 return (await readLatest("live")).filter(isDeviceEvent);
}
export async function history(system: SystemId, source: Source, limit?: number): Promise<EventRow[]> {
 return (await readHistory(system, "live", limit)).filter(isDeviceEvent);
}
