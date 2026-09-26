import { NextResponse } from "next/server";
import { hasToken } from "@/lib/auth";
import { insertEvent } from "@/lib/storage";
import { telemetrySchema } from "@/lib/model";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!hasToken(request, process.env.INGEST_TOKEN)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = telemetrySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid telemetry", issues: parsed.error.flatten() }, { status: 422 });
  const skew = Math.abs(Date.now() - Date.parse(parsed.data.recordedAt));
  if (skew > 24 * 3600_000) return NextResponse.json({ error: "recordedAt must be within 24 hours" }, { status: 422 });
  const id = await insertEvent(parsed.data, "live");

  // Mirror to Supabase if credentials are configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        "apikey": process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        source: "live",
        system: parsed.data.system,
        device_id: parsed.data.deviceId,
        name: parsed.data.name,
        location: parsed.data.location,
        recorded_at: parsed.data.recordedAt,
        received_at: new Date().toISOString(),
        health: parsed.data.health || "normal",
        note: parsed.data.note || "",
        data_json: parsed.data.data,
        position_json: parsed.data.position || null,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({ id, accepted: true }, { status: 201 });
}
