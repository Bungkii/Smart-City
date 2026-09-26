import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ssid: "ACT-SmartCity-2.4G",
      pass: "ACT12345678",
      hotspotRecommendation: "เปิด Hotspot มือถือชื่อ 'ACT-SmartCity-2.4G' รหัส 'ACT12345678' เพื่อให้บอร์ดทั้งหมด 5 บอร์ดเชื่อมต่อพร้อมกันทันที",
    });
  }

  try {
    const res = await fetch(`${url}/rest/v1/settings?select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });

    let ssid = "ACT-SmartCity-2.4G";
    let pass = "ACT12345678";

    if (res.ok) {
      const rows = (await res.json()) as Array<{ key: string; value: string }>;
      const ssidRow = rows.find((r) => r.key === "wifi_ssid");
      const passRow = rows.find((r) => r.key === "wifi_pass");
      if (ssidRow) ssid = ssidRow.value;
      if (passRow) pass = passRow.value;
    }

    return NextResponse.json({
      ssid,
      pass,
      hotspotRecommendation: `เปิด Hotspot มือถือชื่อ '${ssid}' รหัส '${pass}' เพื่อให้บอร์ดทั้งหมด 5 บอร์ดเชื่อมต่อพร้อมกันทันที`,
    });
  } catch (err: any) {
    return NextResponse.json({ ssid: "ACT-SmartCity-2.4G", pass: "ACT12345678" });
  }
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  try {
    const body = await request.json();
    const { ssid, pass } = body;

    if (!ssid) {
      return NextResponse.json({ error: "SSID is required" }, { status: 400 });
    }

    if (url && key) {
      // Upsert to Supabase settings
      await Promise.all([
        fetch(`${url}/rest/v1/settings`, {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({ key: "wifi_ssid", value: ssid, updated_at: new Date().toISOString() }),
        }),
        fetch(`${url}/rest/v1/settings`, {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({ key: "wifi_pass", value: pass || "", updated_at: new Date().toISOString() }),
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      ssid,
      pass,
      message: `บันทึกการตั้งค่า Wi-Fi กลาง (${ssid}) สำหรับทั้ง 5 บอร์ดเรียบร้อยแล้ว`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update Wi-Fi settings" }, { status: 500 });
  }
}
