import type { Telemetry } from "./model";

export function demoEvents(): Telemetry[] {
  const now = new Date().toISOString();
  const coordinates: Record<string, [number, number]> = { PK: [13.7569, 100.5015], TR: [13.7558, 100.5024], SL: [13.7562, 100.5035], GT: [13.7574, 100.5029], EN: [13.7551, 100.5014] };
  const base = (deviceId: string, name: string, location: string, health: "normal" | "warning" = "normal") => {
    const [lat, lng] = coordinates[deviceId.slice(0, 2)];
    const index = Number(deviceId.split("-")[1] || 1) - 1;
    return { deviceId, name, location, health, recordedAt: now, position: { lat: lat + (index % 3) * .00024, lng: lng + Math.floor(index / 3) * .00024 } };
  };
  return [
    ...Array.from({ length: 8 }, (_, i): Telemetry => ({ ...base(`PK-${String(i + 1).padStart(2, "0")}`, `ช่องจอด ${String(i + 1).padStart(2, "0")}`, i < 4 ? "อาคาร A" : "อาคาร B", i === 6 ? "warning" : "normal"), system: "parking", data: { occupied: [true, false, true, false, false, true, true, false][i], bay: `A-${String(i + 1).padStart(2, "0")}` } })),
    ...["แยกกลางอัสสัมชัญ", "แยกสถานี", "แยกสวนเมือง"].map((name, i): Telemetry => ({ ...base(`TR-${i + 1}`, name, name, i === 2 ? "warning" : "normal"), system: "traffic", data: { signal: (["green", "red", "yellow"] as const)[i], nsSignal: i === 0 ? "green" : i === 1 ? "red" : "yellow", ewSignal: i === 0 ? "red" : i === 1 ? "green" : "red", activeDirection: i === 0 ? "ฝั่งเหนือ-ใต้ (North-South)" : "ฝั่งตะวันออก-ตก (East-West)", waitSeconds: [25, 42, 9][i], mode: i === 2 ? "fixed" : "adaptive", incident: i === 2 ? "สัญญาณขัดข้องชั่วคราว" : null } })),
    ...["ถนนหลัก 01", "ถนนหลัก 02", "ลานกิจกรรม", "ทางเดินสวน"].map((name, i): Telemetry => ({ ...base(`SL-${i + 1}`, name, i < 2 ? "ถนนหลัก" : "สวนเมือง", i === 3 ? "warning" : "normal"), system: "streetlight", data: { on: i !== 3, brightness: [82, 76, 64, 0][i], mode: i === 2 ? "manual" : "auto", fault: i === 3 ? "หลอดไฟไม่ตอบสนอง" : null } })),
    ...["ประตูทิศเหนือ", "ประตูทิศใต้"].map((name, i): Telemetry => ({ ...base(`GT-${i + 1}`, name, name, i === 1 ? "warning" : "normal"), system: "gate", data: { open: i === 0, direction: i === 0 ? "in" : "out", access: i === 0 ? "granted" : "denied", cardRef: `CARD-••${i + 1}8` } })),
    ...["สถานีกลาง", "สถานีริมสวน"].map((name, i): Telemetry => ({ ...base(`EN-${i + 1}`, name, name, i === 1 ? "warning" : "normal"), system: "environment", data: { pm25: [28, 42][i], temperature: [30.2, 29.4][i], humidity: [64, 69][i] } }))
  ];
}

export function historicalDemoEvent(event: Telemetry, hoursAgo: number): Telemetry {
  const at = new Date(Date.now() - hoursAgo * 3600000).toISOString();
  const data = { ...event.data } as Record<string, any>;
  if (event.system === "parking") data.occupied = hoursAgo % 3 === 0 ? !data.occupied : data.occupied;
  if (event.system === "traffic") { data.waitSeconds = Math.max(4, data.waitSeconds + Math.round(Math.sin(hoursAgo) * 12)); data.signal = (["red", "green", "yellow"] as const)[hoursAgo % 3]; }
  if (event.system === "streetlight") data.brightness = Math.max(0, Math.min(100, data.brightness + Math.round(Math.sin(hoursAgo) * 10)));
  if (event.system === "gate" && hoursAgo > 0) { data.open = hoursAgo % 2 === 0; data.direction = hoursAgo % 2 === 0 ? "in" : "out"; data.access = hoursAgo % 4 === 0 ? "denied" : "granted"; }
  if (event.system === "environment") { data.pm25 = Math.max(7, data.pm25 + Math.round(Math.sin(hoursAgo * .65) * 9)); data.temperature = +(data.temperature + Math.sin(hoursAgo * .4) * 1.8).toFixed(1); data.humidity = Math.round(data.humidity + Math.cos(hoursAgo * .5) * 5); }
  return { ...event, recordedAt: at, data } as Telemetry;
}
