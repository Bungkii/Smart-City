import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { EventRow, Source, SystemId, Telemetry } from "./model";

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  supabaseClient = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  return supabaseClient;
}

export async function getMode(): Promise<Source> { return "live"; }

export async function setMode(mode: Source): Promise<void> {
  const sb = getClient();
  if (!sb) return;

  try {
    await sb.from("settings").upsert({ key: "mode", value: mode, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error("PostgreSQL setMode error:", err);
  }
}

export async function insertEvent(event: Telemetry, source: Source, receivedAt = new Date().toISOString()): Promise<number> {
  const sb = getClient();
  if (!sb) throw new Error("Database is not configured");

  try {
    const { data, error } = await sb.from("events").insert({
      source,
      system: event.system,
      device_id: event.deviceId,
      name: event.name,
      location: event.location,
      recorded_at: event.recordedAt,
      received_at: receivedAt,
      health: event.health,
      note: event.note || null,
      data_json: event.data,
      position_json: event.position || null
    }).select("id").single();

    if (!error && data?.id) {
      return Number(data.id);
    }
  } catch (err) {
    console.error("PostgreSQL insertEvent error:", err);
  }
  throw new Error("Unable to persist telemetry");
}

function mapRowToEvent(r: any): EventRow {
  return {
    id: Number(r.id),
    source: r.source as Source,
    system: r.system as SystemId,
    deviceId: r.device_id,
    name: r.name,
    location: r.location,
    recordedAt: r.recorded_at,
    receivedAt: r.received_at,
    health: r.health,
    note: r.note || undefined,
    data: typeof r.data_json === "string" ? JSON.parse(r.data_json) : r.data_json,
    position: r.position_json ? (typeof r.position_json === "string" ? JSON.parse(r.position_json) : r.position_json) : undefined
  };
}

export async function latest(source: Source): Promise<EventRow[]> {
  const sb = getClient();
  if (!sb) throw new Error("Database is not configured");

  try {
    const { data, error } = await sb
      .from("events")
      .select("*")
      .eq("source", source)
      .order("id", { ascending: false })
      .limit(60);

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const result: EventRow[] = [];
    for (const row of data) {
      if (!seen.has(row.device_id)) {
        seen.add(row.device_id);
        result.push(mapRowToEvent(row));
      }
    }
    return result;
  } catch (error) {
    throw error;
  }
}

export async function history(system: SystemId, source: Source, limit = 60): Promise<EventRow[]> {
  const sb = getClient();
  if (!sb) throw new Error("Database is not configured");

  try {
    const { data, error } = await sb
      .from("events")
      .select("*")
      .eq("system", system)
      .eq("source", source)
      .order("id", { ascending: false })
      .limit(limit);

    if (error) throw error;
    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapRowToEvent);
  } catch (error) {
    throw error;
  }
}

export async function audit(
  command: { system: string; deviceId: string; command: string; reason: string },
  actor: string,
  result: string,
  detail = ""
): Promise<void> {
  const sb = getClient();
  if (!sb) return;

  try {
    await sb.from("command_audit").insert({
      time: new Date().toISOString(),
      actor,
      system: command.system,
      device_id: command.deviceId,
      command: command.command,
      reason: command.reason,
      result,
      detail
    });
  } catch (err) {
    console.error("PostgreSQL audit error:", err);
  }
}

export async function auditHistory(): Promise<any[]> {
  const sb = getClient();
  if (!sb) throw new Error("Database is not configured");

  try {
    const { data, error } = await sb
      .from("command_audit")
      .select("*")
      .order("id", { ascending: false })
      .limit(100);

    if (error || !data) return [];
    return data;
  } catch (error) {
    throw error;
  }
}
