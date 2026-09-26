import { NextResponse } from "next/server";
import { getMode, insertEvent, latest } from "@/lib/storage";
import { demoEvents } from "@/lib/demo";
import type { Telemetry } from "@/lib/model";

export async function POST(request: Request) {
  const mode = await getMode();
  if (mode !== "demo") {
    return NextResponse.json({ error: "Simulator is only active in Demo Mode" }, { status: 400 });
  }

  let body: { system?: string; deviceId?: string; action?: string } = {};
  try {
    body = await request.json();
  } catch {}

  const currentDevices = await latest("demo");
  const now = new Date().toISOString();

  let target = currentDevices.find(d => 
    (body.system ? d.system === body.system : true) && 
    (body.deviceId ? d.deviceId === body.deviceId : true)
  );

  if (!target) {
    target = currentDevices[Math.floor(Math.random() * currentDevices.length)];
  }

  if (!target) {
    return NextResponse.json({ error: "No demo devices found" }, { status: 404 });
  }

  const updatedData = { ...target.data } as Record<string, any>;
  let actionNote = "";

  if (target.system === "parking") {
    updatedData.occupied = !updatedData.occupied;
    actionNote = updatedData.occupied ? `รถเข้าจอดที่ ${updatedData.bay}` : `รถออกจากช่องจอด ${updatedData.bay}`;
  } else if (target.system === "traffic") {
    const signals = ["red", "yellow", "green"] as const;
    const nextSignal = signals[(signals.indexOf(updatedData.signal) + 1) % signals.length];
    updatedData.signal = nextSignal;
    updatedData.waitSeconds = nextSignal === "red" ? 45 : nextSignal === "green" ? 30 : 5;
    actionNote = `เปลี่ยนสัญญาณไฟเป็น ${nextSignal === "red" ? "แดง" : nextSignal === "green" ? "เขียว" : "เหลือง"} ที่ ${target.name}`;
  } else if (target.system === "streetlight") {
    updatedData.on = !updatedData.on;
    updatedData.brightness = updatedData.on ? Math.floor(Math.random() * 40) + 60 : 0;
    actionNote = updatedData.on ? `เปิดไฟสว่าง ${updatedData.brightness}% ที่ ${target.name}` : `ปิดไฟที่ ${target.name}`;
  } else if (target.system === "gate") {
    updatedData.open = !updatedData.open;
    updatedData.direction = updatedData.open ? "in" : null;
    updatedData.access = updatedData.open ? "granted" : null;
    updatedData.cardRef = updatedData.open ? `CARD-••${Math.floor(Math.random() * 90) + 10}` : null;
    actionNote = updatedData.open ? `ทาบบัตรสำเร็จ ประตูเปิด (${target.name})` : `ประตูปิดอัตโนมัติ (${target.name})`;
  } else if (target.system === "environment") {
    const delta = (Math.random() * 8 - 4);
    updatedData.pm25 = Math.max(8, Math.min(95, +(updatedData.pm25 + delta).toFixed(1)));
    updatedData.temperature = +(28 + Math.random() * 4).toFixed(1);
    updatedData.humidity = Math.round(55 + Math.random() * 20);
    actionNote = `อัปเดตสภาพอากาศ: PM2.5 = ${updatedData.pm25} µg/m³ ที่ ${target.name}`;
  }

  const updatedTelemetry: Telemetry = {
    system: target.system as any,
    deviceId: target.deviceId,
    name: target.name,
    location: target.location,
    position: target.position,
    recordedAt: now,
    health: target.health === "warning" && Math.random() > 0.5 ? "normal" : target.health,
    note: actionNote,
    data: updatedData as any
  };

  const newId = await insertEvent(updatedTelemetry, "demo", now);

  return NextResponse.json({
    success: true,
    id: newId,
    event: updatedTelemetry,
    message: actionNote
  });
}
