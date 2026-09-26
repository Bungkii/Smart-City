import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowLeft, Database, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page() {
  const cookieStore = await cookies();
  let todos: { id: number; name: string }[] | null = null;
  let errorMsg = "";

  try {
    const supabase = createClient(cookieStore);
    const { data, error } = await supabase.from("todos").select();
    if (error) {
      errorMsg = error.message;
    } else {
      todos = data;
    }
  } catch (err: any) {
    errorMsg = err?.message || "Failed to initialize Supabase client";
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f4f8f9", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "600px", margin: "0 auto", background: "#ffffff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", border: "1px solid #e1ebed" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "#08aa9a", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>
            <ArrowLeft size={16} /> กลับสู่ Dashboard
          </Link>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#e8f7f5", color: "#08aa9a", padding: "4px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
            <Database size={14} /> Supabase SSR
          </span>
        </div>

        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#0b2338", marginBottom: "0.5rem" }}>
          Supabase Connected Test
        </h1>
        <p style={{ color: "#546e7a", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          ทดสอบการเชื่อมต่อกับ Supabase PostgreSQL Cloud Table <code>todos</code>
        </p>

        {errorMsg ? (
          <div style={{ background: "#fff5f5", border: "1px solid #fed7d7", borderRadius: "8px", padding: "1rem", color: "#c53030", fontSize: "0.85rem" }}>
            <strong>แจ้งเตือน:</strong> {errorMsg}
            <div style={{ marginTop: "6px", color: "#742a2a" }}>
              💡 หากยังไม่ได้สร้างตาราง <code>todos</code> สามารถรันคำสั่งจากไฟล์ <code>supabase_schema.sql</code> ใน Supabase SQL Editor ได้ทันที
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#16a34a", fontSize: "0.9rem", fontWeight: 600, marginBottom: "1rem" }}>
              <CheckCircle2 size={18} /> เชื่อมต่อกับ Supabase Cloud สำเร็จ
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {todos && todos.length > 0 ? (
                todos.map((todo) => (
                  <li
                    key={todo.id}
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      color: "#1e293b",
                      fontSize: "0.9rem",
                    }}
                  >
                    <span style={{ background: "#08aa9a", color: "#fff", width: "20px", height: "20px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700 }}>
                      {todo.id}
                    </span>
                    {todo.name}
                  </li>
                ))
              ) : (
                <li style={{ color: "#94a3b8", fontStyle: "italic", fontSize: "0.9rem" }}>ไม่มีข้อมูลในตาราง todos</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
