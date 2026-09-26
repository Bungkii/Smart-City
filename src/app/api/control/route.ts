import { NextResponse } from "next/server";
import { operatorFor } from "@/lib/auth";
import { audit, getMode, latest } from "@/lib/storage";
import { commandSchema, deviceHealth } from "@/lib/model";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const actor = operatorFor(request);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown; try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid command", issues: parsed.error.flatten() }, { status: 422 });
  const command = parsed.data;
  if (await getMode() !== "live") return NextResponse.json({ error: "Controls require Live Mode" }, { status: 409 });
  const device = (await latest("live")).find(d => d.deviceId === command.deviceId && d.system === command.system);
  if (!device) return NextResponse.json({ error: "Unknown live device" }, { status: 404 });
  if (deviceHealth(device) === "offline") { await audit(command, actor, "rejected", "Device offline"); return NextResponse.json({ error: "Device offline" }, { status: 409 }); }
  if (!process.env.DEVICE_COMMAND_URL || !process.env.DEVICE_COMMAND_TOKEN) { await audit(command, actor, "rejected", "Command adapter not configured"); return NextResponse.json({ error: "Command adapter is not configured" }, { status: 503 }); }
  try {
    const response = await fetch(process.env.DEVICE_COMMAND_URL, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.DEVICE_COMMAND_TOKEN}` }, body: JSON.stringify({ ...command, actor, requestedAt: new Date().toISOString() }), signal: AbortSignal.timeout(8000) });
    const result = response.ok ? "sent" : "failed";
    await audit(command, actor, result, `HTTP ${response.status}`);
    return NextResponse.json({ result }, { status: response.ok ? 202 : 502 });
  } catch (error) {
    await audit(command, actor, "failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Command adapter unavailable" }, { status: 502 });
  }
}
