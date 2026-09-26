import { NextResponse } from "next/server";
import { hasToken } from "@/lib/auth";
import { getMode, setMode } from "@/lib/storage";
import { z } from "zod";

export async function GET() { return NextResponse.json({ mode: await getMode(), liveConfigured: Boolean(process.env.INGEST_TOKEN), commandConfigured: Boolean(process.env.DEVICE_COMMAND_URL && process.env.CONTROL_TOKEN), storage: process.env.DB_DRIVER === "d1" ? "Cloudflare D1" : process.env.DB_DRIVER === "sqlite" ? "SQLite" : "PostgreSQL" }); }
export async function PATCH(request: Request) {
  if (!hasToken(request, process.env.SETTINGS_TOKEN)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = z.object({ mode: z.literal("live") }).strict().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid mode" }, { status: 422 });
  if (parsed.data.mode === "live" && !process.env.INGEST_TOKEN) return NextResponse.json({ error: "Set INGEST_TOKEN first" }, { status: 409 });
  await setMode(parsed.data.mode);
  return NextResponse.json({ mode: await getMode() });
}
