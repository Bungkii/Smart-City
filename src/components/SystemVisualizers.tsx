"use client";
import React, { useState } from "react";
import { 
  CarFront, TrafficCone, Lightbulb, DoorOpen, Gauge, 
  ShieldCheck, AlertTriangle, CheckCircle2, Zap, Clock, 
  Sparkles, RefreshCw, Send, Radio, UserCheck, Flame, 
  Wind, Droplets, Thermometer, ChevronRight, Activity
} from "lucide-react";
import { type EventRow, type SystemId, deviceHealth } from "@/lib/model";

// --- PARKING VISUALIZER ---
export function ParkingVisualizer({ 
  devices, 
  mode, 
  onSimulate 
}: { 
  devices: EventRow[]; 
  mode: "demo" | "live"; 
  onSimulate?: (deviceId: string) => void;
}) {
  const [selectedBay, setSelectedBay] = useState<string | null>(null);
  const parkingDevices = devices.filter(d => d.system === "parking");
  const occupiedCount = parkingDevices.filter(d => (d.data as any).occupied).length;
  const vacantCount = parkingDevices.length - occupiedCount;
  const occupancyPercent = parkingDevices.length ? Math.round((occupiedCount / parkingDevices.length) * 100) : 0;

  return (
    <div className="visualizer-card parking-viz">
      <div className="viz-header">
        <div>
          <span className="viz-tag"><CarFront size={14} /> LIVE PARKING BAY MATRIX</span>
          <h3>ผังช่องจอดรถอัจฉริยะ (Real-time Bay Matrix)</h3>
        </div>
        <div className="viz-stats-pills">
          <span className="pill green">ว่าง: <strong>{vacantCount}</strong></span>
          <span className="pill red">ไม่ว่าง: <strong>{occupiedCount}</strong></span>
          <span className="pill rate">อัตราการใช้งาน: <strong>{occupancyPercent}%</strong></span>
        </div>
      </div>

      <div className="parking-lot-grid">
        {parkingDevices.map((d, index) => {
          const isOccupied = (d.data as any).occupied;
          const bayName = (d.data as any).bay || `A-${String(index + 1).padStart(2, "0")}`;
          const isSelected = selectedBay === d.deviceId;

          return (
            <div 
              key={d.deviceId}
              className={`bay-slot ${isOccupied ? "occupied" : "vacant"} ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setSelectedBay(d.deviceId);
                if (mode === "demo" && onSimulate) onSimulate(d.deviceId);
              }}
              title={mode === "demo" ? "คลิกเพื่อจำลอง รถเข้า/ออกช่องจอด" : undefined}
            >
              <div className="bay-roof">
                <span className="bay-id">{bayName}</span>
                <span className={`bay-status-dot ${isOccupied ? "red" : "green"}`} />
              </div>
              <div className="bay-visual">
                {isOccupied ? (
                  <div className="car-model">
                    <CarFront size={28} className="car-icon" />
                    <span className="car-plate">ACT-{100 + index}</span>
                  </div>
                ) : (
                  <div className="bay-empty-spot">
                    <span>ว่าง</span>
                    {mode === "demo" && <small>คลิกเพื่อจอด</small>}
                  </div>
                )}
              </div>
              <div className="bay-footer">
                <small>{d.name}</small>
              </div>
            </div>
          );
        })}
      </div>

      {mode === "demo" && (
        <div className="viz-hint">
          <Sparkles size={14} /> <span>โหมดสาธิต: คลิกที่ช่องจอดด้านบนเพื่อจำลองรถเข้าจอดหรือออกจากช่องจอดทันที</span>
        </div>
      )}
    </div>
  );
}

// --- TRAFFIC VISUALIZER ---
export function TrafficVisualizer({ 
  device, 
  mode, 
  onSimulate 
}: { 
  device: EventRow; 
  mode: "demo" | "live";
  onSimulate?: (deviceId: string) => void;
}) {
  const data = (device?.data || {}) as any;
  const currentSignal = data.signal || "green";
  const waitSeconds = data.waitSeconds || 25;
  const trafficMode = data.mode || "adaptive";

  return (
    <div className="visualizer-card traffic-viz">
      <div className="viz-header">
        <div>
          <span className="viz-tag"><TrafficCone size={14} /> INTERSECTION SIGNAL SIMULATOR</span>
          <h3>สัญญาณไฟจราจร & ระยะเวลารอคอย</h3>
        </div>
        <span className={`mode-pill ${trafficMode}`}>โหมด: {trafficMode.toUpperCase()}</span>
      </div>

      <div className="traffic-display-area">
        {/* Physical traffic light simulator */}
        <div className="traffic-light-housing">
          <div className={`signal-lens red ${currentSignal === "red" ? "active glow" : ""}`}>
            <span className="lens-reflection" />
          </div>
          <div className={`signal-lens yellow ${currentSignal === "yellow" ? "active glow" : ""}`}>
            <span className="lens-reflection" />
          </div>
          <div className={`signal-lens green ${currentSignal === "green" ? "active glow" : ""}`}>
            <span className="lens-reflection" />
          </div>
        </div>

        {/* Countdown & Info */}
        <div className="traffic-countdown-box">
          <div className="countdown-ring">
            <span className={`countdown-number ${currentSignal}`}>{waitSeconds}</span>
            <span className="countdown-unit">วินาที (s)</span>
          </div>
          <div className="signal-status-detail">
            <strong>สถานะปัจจุบัน: ไฟ{currentSignal === "red" ? "แดง (หยุด)" : currentSignal === "yellow" ? "เหลือง (เตรียมหยุด)" : "เขียว (ผ่านได้)"}</strong>
            <p>จุดติดตั้ง: {device?.name || "แยกศาลากลาง"} ({device?.location || "ทางเข้าหลัก"})</p>
            {data.incident && (
              <div className="incident-alert">
                <AlertTriangle size={15} /> {data.incident}
              </div>
            )}
          </div>
        </div>
      </div>

      {mode === "demo" && onSimulate && (
        <div className="viz-actions">
          <button className="sim-btn" onClick={() => onSimulate(device.deviceId)}>
            <RefreshCw size={15} /> สลับสัญญาณไฟถัดไป (Cycle Next Phase)
          </button>
        </div>
      )}
    </div>
  );
}

// --- STREETLIGHT VISUALIZER ---
export function StreetlightVisualizer({ 
  devices, 
  mode, 
  onSimulate 
}: { 
  devices: EventRow[]; 
  mode: "demo" | "live";
  onSimulate?: (deviceId: string) => void;
}) {
  const slDevices = devices.filter(d => d.system === "streetlight");
  const onCount = slDevices.filter(d => (d.data as any).on).length;
  const avgBrightness = slDevices.length 
    ? Math.round(slDevices.reduce((acc, d) => acc + ((d.data as any).brightness || 0), 0) / slDevices.length)
    : 0;
  const estPowerKw = (onCount * 0.12 * (avgBrightness / 100)).toFixed(2);
  const estEnergySaved = (slDevices.length * 0.12 * (1 - avgBrightness / 100) * 10).toFixed(1);

  return (
    <div className="visualizer-card streetlight-viz">
      <div className="viz-header">
        <div>
          <span className="viz-tag"><Lightbulb size={14} /> ADAPTIVE LIGHTING MATRIX</span>
          <h3>ระบบไฟถนนอัจฉริยะ & ประสิทธิภาพพลังงาน</h3>
        </div>
        <div className="viz-stats-pills">
          <span className="pill green">เปิดใช้งาน: <strong>{onCount} / {slDevices.length}</strong></span>
          <span className="pill blue">ความสว่างเฉลี่ย: <strong>{avgBrightness}%</strong></span>
          <span className="pill yellow">กำลังไฟ: <strong>{estPowerKw} kW</strong></span>
        </div>
      </div>

      <div className="streetlight-grid">
        {slDevices.map((d) => {
          const dData = (d.data || {}) as any;
          const isOn = dData.on;
          const brightness = dData.brightness || 0;

          return (
            <div 
              key={d.deviceId} 
              className={`light-node ${isOn ? "on" : "off"}`}
              onClick={() => {
                if (mode === "demo" && onSimulate) onSimulate(d.deviceId);
              }}
              title={mode === "demo" ? "คลิกเพื่อสลับ เปิด/ปิดไฟ" : undefined}
            >
              <div className="light-lamp-icon" style={{ opacity: isOn ? 0.4 + (brightness / 100) * 0.6 : 0.2 }}>
                <Lightbulb size={24} className={isOn ? "glow-icon" : ""} />
                {isOn && <span className="light-halo" style={{ transform: `scale(${0.7 + (brightness / 100) * 0.6})` }} />}
              </div>
              <div className="light-node-info">
                <strong>{d.name}</strong>
                <span className="light-meta">{d.location}</span>
                <div className="brightness-bar">
                  <div className="bar-fill" style={{ width: `${isOn ? brightness : 0}%` }} />
                </div>
                <small>{isOn ? `สว่าง ${brightness}% (${dData.mode})` : "ปิดการทำงาน"}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className="energy-eco-footer">
        <div className="eco-badge">
          <Zap size={16} className="eco-icon" />
          <span>ประหยัดพลังงานสะสมวันนี้: <strong>{estEnergySaved} kWh</strong> (ลด CO₂ ~{(+estEnergySaved * 0.49).toFixed(1)} kg)</span>
        </div>
      </div>
    </div>
  );
}

// --- GATE VISUALIZER ---
export function GateVisualizer({ 
  device, 
  mode, 
  onSimulate 
}: { 
  device: EventRow; 
  mode: "demo" | "live";
  onSimulate?: (deviceId: string) => void;
}) {
  const data = (device?.data || {}) as any;
  const isOpen = Boolean(data.open);
  const access = data.access || "granted";
  const direction = data.direction || "in";
  const cardRef = data.cardRef || "CARD-••88";

  const [activeTab, setActiveTab] = useState<"visual" | "cards" | "logs">("visual");
  const [cards, setCards] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCardId, setNewCardId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Student");
  const [newStatus, setNewStatus] = useState("allow");
  const [saveMsg, setSaveMsg] = useState("");

  const loadRfidData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rfid");
      if (res.ok) {
        const json = await res.json();
        setCards(json.cards || []);
        setLogs(json.logs || []);
      }
    } catch {
      // ignore error
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardId || !newName) return;
    try {
      const res = await fetch("/api/rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: newCardId,
          name: newName,
          role: newRole,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setSaveMsg("✓ บันทึกข้อมูลบัตรลง Supabase สำเร็จ!");
        setNewCardId("");
        setNewName("");
        loadRfidData();
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        setSaveMsg("✕ เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch {
      setSaveMsg("✕ ไม่สามารถเชื่อมต่อกับ Supabase ได้");
    }
  };

  return (
    <div className="visualizer-card gate-viz">
      <div className="viz-header">
        <div>
          <span className="viz-tag"><DoorOpen size={14} /> BARRIER GATE & RFID SCANNER</span>
          <h3>ระบบไม้กั้น & สแกนเนอร์ RFID (Supabase Cloud Database)</h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div className="viz-tab-toggle" style={{ display: "inline-flex", background: "#f0f4f6", padding: "2px", borderRadius: "8px" }}>
            <button
              onClick={() => setActiveTab("visual")}
              style={{
                border: "none",
                background: activeTab === "visual" ? "#08aa9a" : "transparent",
                color: activeTab === "visual" ? "#fff" : "#546e7a",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ภาพจำลอง
            </button>
            <button
              onClick={() => { setActiveTab("cards"); loadRfidData(); }}
              style={{
                border: "none",
                background: activeTab === "cards" ? "#08aa9a" : "transparent",
                color: activeTab === "cards" ? "#fff" : "#546e7a",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              บัตร RFID ({cards.length || 4})
            </button>
            <button
              onClick={() => { setActiveTab("logs"); loadRfidData(); }}
              style={{
                border: "none",
                background: activeTab === "logs" ? "#08aa9a" : "transparent",
                color: activeTab === "logs" ? "#fff" : "#546e7a",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ประวัติสแกน ({logs.length})
            </button>
          </div>
          <span className={`gate-status-pill ${isOpen ? "open" : "closed"}`}>
            {isOpen ? "ไม้กั้นเปิดอยู่ (OPEN)" : "ไม้กั้นปิด (CLOSED)"}
          </span>
        </div>
      </div>

      {activeTab === "visual" && (
        <>
          <div className="gate-display-area">
            {/* Animated Gate Barrier Simulation */}
            <div className="gate-barrier-stage">
              <div className="gate-pole" />
              <div className={`gate-arm ${isOpen ? "raised" : "lowered"}`}>
                <span className="arm-stripes" />
              </div>
              <div className={`rfid-terminal-scanner ${access === "granted" ? "granted" : "denied"}`}>
                <div className="scanner-led" />
                <Radio size={16} />
                <small>RFID SENSOR</small>
              </div>
            </div>

            {/* Live Card Tap Reader Detail */}
            <div className="gate-reader-info">
              <div className="rfid-card-preview">
                <div className="card-chip" />
                <div className="card-brand">ACT SMART CAMPUS PASS</div>
                <div className="card-number">{cardRef}</div>
                <div className="card-holder">
                  <span>ทิศทาง: <strong>{direction === "in" ? "ขาเข้า (IN)" : "ขาออก (OUT)"}</strong></span>
                  <span className={`access-tag ${access}`}>{access === "granted" ? "✓ อนุญาต (Granted)" : "✕ ปฏิเสธ (Denied)"}</span>
                </div>
              </div>
            </div>
          </div>

          {mode === "demo" && onSimulate && (
            <div className="viz-actions">
              <button className="sim-btn" onClick={() => onSimulate(device.deviceId)}>
                <UserCheck size={15} /> จำลองการทาบบัตร RFID (Simulate Card Tap)
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === "cards" && (
        <div style={{ padding: "1rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0b2338", fontWeight: 700 }}>
              ฐานข้อมูลบัตร RFID บน Supabase (Table: rfid_cards)
            </h4>
            <button
              onClick={loadRfidData}
              disabled={loading}
              style={{ border: "1px solid #d0dee2", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
            </button>
          </div>

          {/* Add / Edit Form */}
          <form onSubmit={handleSaveCard} style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 1fr auto", gap: "8px", background: "#f4f8f9", padding: "10px", borderRadius: "8px", marginBottom: "1rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="UID บัตร (เช่น 4A6F12C3)"
              value={newCardId}
              onChange={(e) => setNewCardId(e.target.value)}
              required
              style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #c2d6dc", fontSize: "0.82rem" }}
            />
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล / สังกัด"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #c2d6dc", fontSize: "0.82rem" }}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #c2d6dc", fontSize: "0.82rem" }}
            >
              <option value="Student">Student (นักเรียน)</option>
              <option value="Teacher">Teacher (ครู)</option>
              <option value="Staff">Staff (บุคลากร)</option>
              <option value="VIP">VIP (ผู้บริหาร)</option>
              <option value="Guest">Guest (บุคคลภายนอก)</option>
            </select>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{ padding: "6px 8px", borderRadius: "6px", border: "1px solid #c2d6dc", fontSize: "0.82rem" }}
            >
              <option value="allow">Allow (อนุญาต)</option>
              <option value="banned">Banned (ระงับ)</option>
            </select>
            <button
              type="submit"
              style={{ background: "#08aa9a", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
            >
              + บันทึกบัตร
            </button>
          </form>

          {saveMsg && (
            <div style={{ color: saveMsg.startsWith("✓") ? "#16a34a" : "#dc2626", fontSize: "0.82rem", marginBottom: "8px", fontWeight: 600 }}>
              {saveMsg}
            </div>
          )}

          {/* Card Table */}
          <div style={{ maxHeight: "220px", overflowY: "auto", border: "1px solid #e1ebed", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e1ebed", textAlign: "left", color: "#546e7a" }}>
                  <th style={{ padding: "8px 12px" }}>Card UID</th>
                  <th style={{ padding: "8px 12px" }}>ชื่อผู้ถือบัตร</th>
                  <th style={{ padding: "8px 12px" }}>ประเภท (Role)</th>
                  <th style={{ padding: "8px 12px" }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c, i) => (
                  <tr key={c.card_id || i} style={{ borderBottom: "1px solid #f0f4f6" }}>
                    <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700, color: "#0b2338" }}>{c.card_id}</td>
                    <td style={{ padding: "8px 12px", color: "#1e293b" }}>{c.name}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ background: "#e8f7f5", color: "#08aa9a", padding: "2px 8px", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600 }}>
                        {c.role}
                      </span>
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        background: c.status === "allow" ? "#ecfdf5" : "#fef2f2",
                        color: c.status === "allow" ? "#16a34a" : "#dc2626",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}>
                        {c.status === "allow" ? "✓ อนุญาต" : "✕ ระงับ"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logs" && (
        <div style={{ padding: "1rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0b2338", fontWeight: 700 }}>
              ประวัติการสแกนผ่านด่าน Real-time บน Supabase (Table: gate_logs)
            </h4>
            <button
              onClick={loadRfidData}
              disabled={loading}
              style={{ border: "1px solid #d0dee2", background: "#f8fafc", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
            </button>
          </div>

          <div style={{ maxHeight: "240px", overflowY: "auto", border: "1px solid #e1ebed", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e1ebed", textAlign: "left", color: "#546e7a" }}>
                  <th style={{ padding: "8px 12px" }}>เวลาที่แตะ</th>
                  <th style={{ padding: "8px 12px" }}>Card UID</th>
                  <th style={{ padding: "8px 12px" }}>ผู้ถือบัตร / สังกัด</th>
                  <th style={{ padding: "8px 12px" }}>ทิศทาง</th>
                  <th style={{ padding: "8px 12px" }}>ผลการตรวจสิทธิ์</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((lg, i) => (
                    <tr key={lg.id || i} style={{ borderBottom: "1px solid #f0f4f6" }}>
                      <td style={{ padding: "8px 12px", color: "#64748b" }}>
                        {lg.scanned_at ? new Date(lg.scanned_at).toLocaleTimeString("th-TH") : "-"}
                      </td>
                      <td style={{ padding: "8px 12px", fontFamily: "monospace", fontWeight: 700 }}>{lg.card_id}</td>
                      <td style={{ padding: "8px 12px" }}>{lg.name || "บุคคลภายนอก"} ({lg.role || "Guest"})</td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{ fontWeight: 600, color: lg.action === "IN" ? "#08aa9a" : "#64748b" }}>
                          {lg.action}
                        </span>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <span style={{
                          background: lg.status === "allow" ? "#ecfdf5" : "#fef2f2",
                          color: lg.status === "allow" ? "#16a34a" : "#dc2626",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}>
                          {lg.status === "allow" ? "✓ อนุญาต (Granted)" : "✕ ปฏิเสธ (Denied)"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                      ยังไม่มีประวัติการสแกนบัตร (เมื่อมีการทาบบัตรที่บอร์ด ข้อมูลจะปรากฏที่นี่ทันที)
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// --- ENVIRONMENT VISUALIZER ---
export function EnvironmentVisualizer({ 
  device, 
  mode, 
  onSimulate 
}: { 
  device: EventRow; 
  mode: "demo" | "live";
  onSimulate?: (deviceId: string) => void;
}) {
  const data = (device?.data || {}) as any;
  const pm25 = typeof data.pm25 === "number" ? data.pm25 : 25;
  const temp = typeof data.temperature === "number" ? data.temperature : 30.2;
  const humidity = typeof data.humidity === "number" ? data.humidity : 65;

  // Air Quality Level (Thai PCD Criteria)
  let aqiCategory = { label: "ดีมาก (Excellent)", color: "#10b981", class: "good", desc: "คุณภาพอากาศดีมาก เหมาะสำหรับกิจกรรมกลางแจ้ง" };
  if (pm25 > 75) {
    aqiCategory = { label: "มีผลกระทบต่อสุขภาพ (Hazardous)", color: "#ef4444", class: "hazard", desc: "มีผลกระทบต่อสุขภาพ ควรสวมหน้ากาก N95 และเลี่ยงกิจกรรมกลางแจ้ง" };
  } else if (pm25 > 37.5) {
    aqiCategory = { label: "เริ่มมีผลกระทบ (Unhealthy)", color: "#f59e0b", class: "warning", desc: "เริ่มมีผลกระทบต่อสุขภาพ ผู้มีโรคประจำตัวควรระวัง" };
  } else if (pm25 > 25) {
    aqiCategory = { label: "ปานกลาง (Moderate)", color: "#eab308", class: "moderate", desc: "คุณภาพอากาศปานกลาง สามารถทำกิจกรรมได้ตามปกติ" };
  }

  return (
    <div className="visualizer-card env-viz">
      <div className="viz-header">
        <div>
          <span className="viz-tag"><Gauge size={14} /> AIR QUALITY & METEOROLOGY</span>
          <h3>สถานีตรวจวัดคุณภาพอากาศ & สภาพแวดล้อม</h3>
        </div>
        <span className={`aqi-badge ${aqiCategory.class}`}>
          {aqiCategory.label}
        </span>
      </div>

      <div className="env-metrics-grid">
        {/* Main PM2.5 Radial Card */}
        <div className="pm25-hero-card" style={{ borderColor: `${aqiCategory.color}40` }}>
          <div className="pm25-gauge-circle" style={{ background: `radial-gradient(circle, #0f2338 60%, ${aqiCategory.color}30 100%)` }}>
            <span className="pm25-val" style={{ color: aqiCategory.color }}>{pm25}</span>
            <span className="pm25-unit">µg/m³</span>
            <small>PM2.5</small>
          </div>
          <p className="pm25-desc">{aqiCategory.desc}</p>
        </div>

        {/* Secondary Weather Cards */}
        <div className="weather-sub-cards">
          <div className="weather-metric-pill">
            <Thermometer size={20} className="pill-icon red" />
            <div>
              <span className="pill-label">อุณหภูมิ (Temp)</span>
              <strong>{temp} °C</strong>
            </div>
          </div>

          <div className="weather-metric-pill">
            <Droplets size={20} className="pill-icon blue" />
            <div>
              <span className="pill-label">ความชื้นสัมพัทธ์ (Humidity)</span>
              <strong>{humidity} %</strong>
            </div>
          </div>

          <div className="weather-metric-pill">
            <Wind size={20} className="pill-icon cyan" />
            <div>
              <span className="pill-label">ดัชนีความสบาย (Comfort)</span>
              <strong>{temp > 33 ? "ร้อนอบอ้าว" : temp < 26 ? "เย็นสบาย" : "เหมาะสม"}</strong>
            </div>
          </div>
        </div>
      </div>

      {mode === "demo" && onSimulate && (
        <div className="viz-actions">
          <button className="sim-btn" onClick={() => onSimulate(device.deviceId)}>
            <RefreshCw size={15} /> สุ่มค่าสภาพอากาศใหม่ (Simulate Weather Shift)
          </button>
        </div>
      )}
    </div>
  );
}
