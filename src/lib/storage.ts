import * as sqlite from "./db";
import * as d1 from "./d1";
import type { Source, SystemId, Telemetry } from "./model";

const remote = process.env.DB_DRIVER === "d1";
export async function getMode() { return remote ? d1.getMode() : sqlite.getMode(); }
export async function setMode(mode: Source) { return remote ? d1.setMode(mode) : sqlite.setMode(mode); }
export async function insertEvent(event: Telemetry, source: Source, receivedAt?: string) { return remote ? d1.insertEvent(event, source, receivedAt) : sqlite.insertEvent(event, source, receivedAt); }
export async function latest(source: Source) { return remote ? d1.latest(source) : sqlite.latest(source); }
export async function history(system: SystemId, source: Source, limit?: number) { return remote ? d1.history(system, source, limit) : sqlite.history(system, source, limit); }
export async function audit(command: { system: string; deviceId: string; command: string; reason: string }, actor: string, result: string, detail?: string) { return remote ? d1.audit(command, actor, result, detail) : sqlite.audit(command, actor, result, detail); }
export async function auditHistory() { return remote ? d1.auditHistory() : sqlite.auditHistory(); }
export async function syncFromSupabase() { if (!remote) await sqlite.syncFromSupabase(); }
