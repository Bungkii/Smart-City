import { NextResponse } from "next/server";
import { getMode, latest, history, syncFromSupabase } from "@/lib/storage";
import { deviceHealth, systemIds } from "@/lib/model";

export const dynamic = "force-dynamic";
export async function GET() {
 try {
  const mode = await getMode();
  if (mode === "live") {
    await syncFromSupabase();
  }
  const devices = await latest(mode);
  const alerts = devices.filter(d => deviceHealth(d) !== "normal").map(d => ({ id: d.id, deviceId: d.deviceId, name: d.name, system: d.system, health: deviceHealth(d), note: deviceHealth(d) === "offline" ? "ไม่พบข้อมูลใหม่ตามเวลาที่กำหนด" : d.note || "โปรดตรวจสอบอุปกรณ์", time: d.receivedAt }));
  const histories = await Promise.all(systemIds.map(id => history(id, mode, 60)));
  return NextResponse.json({ mode, devices, alerts, history: Object.fromEntries(systemIds.map((id, i) => [id, histories[i]])), serverTime: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
 } catch {
  return NextResponse.json({ error: "Data source unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
 }
}
