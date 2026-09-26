import { NextResponse } from "next/server";
import { hasToken } from "@/lib/auth";
import { auditHistory } from "@/lib/storage";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!hasToken(request, process.env.SETTINGS_TOKEN)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ items: await auditHistory() }, { headers: { "cache-control": "no-store" } });
}
