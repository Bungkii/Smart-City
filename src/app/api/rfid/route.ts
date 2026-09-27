import { hasToken } from "@/lib/auth";
import { isRegisteredCard } from "@/lib/data-integrity";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const uidSchema = z.string().trim().toUpperCase().regex(/^(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/, "UID ต้องเป็นเลขฐานสิบหก 8, 14 หรือ 20 ตัวอักษร");
const cardSchema = z.object({
  card_id: uidSchema,
  name: z.string().trim().min(2).max(120),
  role: z.enum(["Student", "Teacher", "Staff", "VIP", "Guest"]),
  status: z.enum(["allow", "banned"]),
}).strict();
const editSchema = cardSchema.omit({ card_id: true });

type Card = z.infer<typeof cardSchema> & { created_at?: string; updated_at?: string };
type GateLog = { id: number; card_id: string; name: string | null; role: string | null; status: string; action: string; scanned_at: string };

const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });

function connection(request: Request) {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminToken = process.env.RFID_ADMIN_TOKEN;
  if (!url || !key || !adminToken) return { error: json({ error: "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY หรือ RFID_ADMIN_TOKEN สำหรับทะเบียนบัตร" }, 503) };
  if (!hasToken(request, adminToken)) return { error: json({ error: "ต้องยืนยันสิทธิ์ผู้ดูแลทะเบียนบัตร" }, 401) };
  return { url: url.replace(/\/$/, ""), key };
}

function headers(key: string, prefer?: string): HeadersInit {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function readBody(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { return null; }
}

export async function GET(request: Request) {
  const config = connection(request);
  if (config.error) return config.error;
  const { url, key } = config;
  try {
    const [cardsRes, logsRes] = await Promise.all([
      fetch(`${url}/rest/v1/rfid_cards?select=card_id,name,role,status,created_at,updated_at&order=updated_at.desc&limit=501`, { headers: headers(key), cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch(`${url}/rest/v1/gate_logs?select=id,card_id,name,role,status,action,scanned_at&order=scanned_at.desc&limit=50`, { headers: headers(key), cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);
    if (!cardsRes.ok || !logsRes.ok) return json({ error: "อ่านทะเบียนบัตรหรือประวัติการสแกนจากฐานข้อมูลไม่สำเร็จ" }, 502);
    const cards = (await cardsRes.json() as Card[]).filter(isRegisteredCard);
    const logs = await logsRes.json() as GateLog[];
    return json({ cards: cards.slice(0, 500), logs, hasMoreCards: cards.length > 500 });
  } catch {
    return json({ error: "เชื่อมต่อฐานข้อมูลทะเบียนบัตรไม่สำเร็จ" }, 502);
  }
}

export async function POST(request: Request) {
  const config = connection(request);
  if (config.error) return config.error;
  const parsed = cardSchema.safeParse(await readBody(request));
  if (!parsed.success) return json({ error: "ข้อมูลบัตรไม่ถูกต้อง", issues: parsed.error.flatten() }, 422);
  const { url, key } = config;
  try {
    const res = await fetch(`${url}/rest/v1/rfid_cards`, {
      method: "POST", headers: headers(key, "return=representation"),
      body: JSON.stringify(parsed.data), cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (res.status === 409) return json({ error: "UID นี้ลงทะเบียนแล้ว ให้เลือกแก้ไขบัตรเดิม" }, 409);
    if (!res.ok) return json({ error: "ฐานข้อมูลปฏิเสธการเพิ่มบัตร" }, 502);
    const saved = await res.json() as Card[];
    if (!saved.length) return json({ error: "ไม่สามารถยืนยันผลการเพิ่มบัตรได้" }, 502);
    return json({ card: saved[0] }, 201);
  } catch {
    return json({ error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ ยังไม่ยืนยันว่าบันทึกบัตรแล้ว" }, 502);
  }
}

export async function PATCH(request: Request) {
  const config = connection(request);
  if (config.error) return config.error;
  const { searchParams } = new URL(request.url);
  const uid = uidSchema.safeParse(searchParams.get("card_id"));
  const parsed = editSchema.safeParse(await readBody(request));
  if (!uid.success || !parsed.success) return json({ error: "ข้อมูลแก้ไขบัตรไม่ถูกต้อง" }, 422);
  const { url, key } = config;
  try {
    const res = await fetch(`${url}/rest/v1/rfid_cards?card_id=eq.${uid.data}&select=card_id,name,role,status,created_at,updated_at`, {
      method: "PATCH", headers: headers(key, "return=representation"),
      body: JSON.stringify({ ...parsed.data, updated_at: new Date().toISOString() }),
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json({ error: "ฐานข้อมูลปฏิเสธการแก้ไขบัตร" }, 502);
    const saved = await res.json() as Card[];
    if (!saved.length) return json({ error: "ไม่พบ UID นี้ในทะเบียนบัตร" }, 404);
    return json({ card: saved[0] });
  } catch {
    return json({ error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ ยังไม่ยืนยันว่าบันทึกการแก้ไขแล้ว" }, 502);
  }
}

export async function DELETE(request: Request) {
  const config = connection(request);
  if (config.error) return config.error;
  const { searchParams } = new URL(request.url);
  const uid = uidSchema.safeParse(searchParams.get("card_id"));
  if (!uid.success) return json({ error: "UID บัตรไม่ถูกต้อง" }, 422);
  const { url, key } = config;
  try {
    const res = await fetch(`${url}/rest/v1/rfid_cards?card_id=eq.${uid.data}&select=card_id`, {
      method: "DELETE", headers: headers(key, "return=representation"),
      cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return json({ error: "ฐานข้อมูลปฏิเสธการลบบัตร" }, 502);
    const deleted = await res.json() as { card_id: string }[];
    if (!deleted.length) return json({ error: "ไม่พบ UID นี้ในทะเบียนบัตร" }, 404);
    return json({ deletedCardId: deleted[0].card_id });
  } catch {
    return json({ error: "เชื่อมต่อฐานข้อมูลไม่สำเร็จ ยังไม่ยืนยันว่าลบบัตรแล้ว" }, 502);
  }
}
