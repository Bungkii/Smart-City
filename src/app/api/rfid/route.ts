import { isRegisteredCard } from "@/lib/data-integrity";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return NextResponse.json({ error: "RFID database is not configured" }, { status: 503 });

  try {
    const [cardsRes, logsRes] = await Promise.all([
      fetch(`${url}/rest/v1/rfid_cards?select=*&order=updated_at.desc`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/gate_logs?select=*&order=scanned_at.desc&limit=30`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: "no-store",
      }),
    ]);

    if (!cardsRes.ok || !logsRes.ok) throw new Error("RFID database unavailable");
    const cards = (await cardsRes.json()).filter(isRegisteredCard);
    const logs = logsRes.ok ? await logsRes.json() : [];

    return NextResponse.json({ cards, logs });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch RFID data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { card_id, name, role, status } = body;

    if (!card_id || !name) {
      return NextResponse.json({ error: "card_id and name are required" }, { status: 400 });
    }

    const cleanCardId = String(card_id).trim().toUpperCase();

    const res = await fetch(`${url}/rest/v1/rfid_cards`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({
        card_id: cleanCardId,
        name: name.trim(),
        role: role || "Student",
        status: status || "allow",
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const saved = await res.json();
    return NextResponse.json({ success: true, data: saved });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
