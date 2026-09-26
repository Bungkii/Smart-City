import { z } from "zod";

export const systemIds = ["parking", "traffic", "streetlight", "gate", "environment"] as const;
export type SystemId = (typeof systemIds)[number];
export type Health = "normal" | "warning" | "offline";
export type Source = "demo" | "live";
export const systems: Record<SystemId, { title: string; en: string; icon: string; unit: string }> = {
  parking: { title: "ที่จอดรถอัจฉริยะ", en: "Smart Parking", icon: "P", unit: "ช่องจอด" },
  traffic: { title: "สัญญาณจราจร", en: "Adaptive Traffic", icon: "T", unit: "แยก" },
  streetlight: { title: "ไฟถนนอัจฉริยะ", en: "Adaptive Street Lights", icon: "L", unit: "จุด" },
  gate: { title: "ประตู RFID", en: "RFID Gate Access", icon: "G", unit: "ประตู" },
  environment: { title: "สถานีสิ่งแวดล้อม", en: "Environment Station", icon: "E", unit: "สถานี" }
};

const base = z.object({
  deviceId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(100),
  location: z.string().min(1).max(100),
  position: z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).strict().optional(),
  recordedAt: z.string().datetime({ offset: true }),
  health: z.enum(["normal", "warning"]),
  note: z.string().max(300).optional()
});
export const telemetrySchema = z.discriminatedUnion("system", [
  base.extend({ system: z.literal("parking"), data: z.object({ occupied: z.boolean(), bay: z.string().min(1).max(32) }).strict() }),
  base.extend({ system: z.literal("traffic"), data: z.object({
    signal: z.enum(["red", "yellow", "green"]),
    activeDirection: z.string().max(100).optional(),
    nSignal: z.enum(["red", "yellow", "green"]).optional(),
    eSignal: z.enum(["red", "yellow", "green"]).optional(),
    sSignal: z.enum(["red", "yellow", "green"]).optional(),
    wSignal: z.enum(["red", "yellow", "green"]).optional(),
    nsSignal: z.enum(["red", "yellow", "green"]).optional(),
    ewSignal: z.enum(["red", "yellow", "green"]).optional(),
    waitSeconds: z.number().int().min(0).max(600),
    mode: z.enum(["adaptive", "fixed", "manual"]),
    incident: z.string().max(200).nullable().optional()
  }).strict() }),
  base.extend({ system: z.literal("streetlight"), data: z.object({ on: z.boolean(), brightness: z.number().min(0).max(100), mode: z.enum(["auto", "manual"]), fault: z.string().max(200).nullable() }).strict() }),
  base.extend({ system: z.literal("gate"), data: z.object({ open: z.boolean(), direction: z.enum(["in", "out"]).nullable(), access: z.enum(["granted", "denied"]).nullable(), cardRef: z.string().max(64).nullable() }).strict() }),
  base.extend({ system: z.literal("environment"), data: z.object({ pm25: z.number().min(0).max(2000), temperature: z.number().min(-50).max(80), humidity: z.number().min(0).max(100) }).strict() })
]);
export type Telemetry = z.infer<typeof telemetrySchema>;
export type EventRow = Telemetry & { id: number; source: Source; receivedAt: string };
export const commandSchema = z.discriminatedUnion("system", [
  z.object({ system: z.literal("gate"), deviceId: z.string().min(1).max(64), command: z.enum(["open", "close"]), reason: z.string().min(3).max(200) }),
  z.object({ system: z.literal("traffic"), deviceId: z.string().min(1).max(64), command: z.enum(["adaptive", "fixed", "manual"]), reason: z.string().min(3).max(200) }),
  z.object({ system: z.literal("streetlight"), deviceId: z.string().min(1).max(64), command: z.enum(["auto", "manual", "on", "off"]), reason: z.string().min(3).max(200) })
]);

export function deviceHealth(event: EventRow, now = Date.now()): Health {
  const timeout = Number(process.env.OFFLINE_AFTER_SECONDS || 120);
  if (event.source === "live" && now - Date.parse(event.receivedAt) > timeout * 1000) return "offline";
  return event.health;
}
