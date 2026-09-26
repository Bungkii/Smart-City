"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  mode
}: { 
  devices: EventRow[]; 
  mode: "live";
}) {
  const [selectedBay, setSelectedBay] = useState<string | null>(null);
  const parkingDevices = devices.filter(d => d.system === "parking");
  const occupiedCount = parkingDevices.filter(d => (d.data as any).occupied).length;
  const vacantCount = parkingDevices.length - occupiedCount;
  const occupancyPercent = parkingDevices.length ? Math.round((occupiedCount / parkingDevices.length) * 100) : 0;

  return (
    <motion.div 
      className="visualizer-card parking-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
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
            <motion.div 
              key={d.deviceId}
              className={`bay-slot ${isOccupied ? "occupied" : "vacant"} ${isSelected ? "selected" : ""}`}
              onClick={() => setSelectedBay(d.deviceId)}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
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
                  </div>
                )}
              </div>
              <div className="bay-footer">
                <small>{d.name}</small>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// --- TRAFFIC VISUALIZER ---
export function TrafficVisualizer({ 
  device, 
  mode
}: { 
  device: EventRow; 
  mode: "live";
}) {
  const data = (device?.data || {}) as any;
  const currentSignal = data.signal;
  const activeDirection = data.activeDirection || "ไม่ระบุทิศทาง";
  const waitSeconds = data.waitSeconds ?? "—";
  const trafficMode = data.mode || "—";

  // Check if 4-way signals exist or compute from 2-way / fallback
  const is4Way = Boolean(data.nSignal || data.eSignal || data.sSignal || data.wSignal);
  const nSignal = data.nSignal || data.nsSignal;
  const eSignal = data.eSignal || data.ewSignal;
  const sSignal = data.sSignal || data.nsSignal;
  const wSignal = data.wSignal || data.ewSignal;

  const directions = is4Way ? [
    { id: "N", name: "ทิศเหนือ (North - N)", sensor: "Ultrasonic 1", sig: nSignal },
    { id: "E", name: "ทิศตะวันออก (East - E)", sensor: "PIR 1", sig: eSignal },
    { id: "S", name: "ทิศใต้ (South - S)", sensor: "Ultrasonic 2", sig: sSignal },
    { id: "W", name: "ทิศตะวันตก (West - W)", sensor: "PIR 2", sig: wSignal },
  ] : [
    { id: "NS", name: "ฝั่งเหนือ-ใต้ (N-S)", sensor: "Sensor Group 1", sig: nSignal },
    { id: "EW", name: "ฝั่งตะวันออก-ตก (E-W)", sensor: "Sensor Group 2", sig: eSignal },
  ];

  return (
    <motion.div 
      className="visualizer-card traffic-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="viz-header">
        <div>
          <span className="viz-tag"><TrafficCone size={14} /> 4-WAY ADAPTIVE INTERSECTION</span>
          <h3>สัญญาณไฟจราจร 4 ทิศทาง (สี่แยกกลางอัสสัมชัญ)</h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{
            background: "#e8f7f5",
            color: "#08aa9a",
            padding: "5px 12px",
            borderRadius: "16px",
            fontSize: "0.85rem",
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "1px solid rgba(8,170,154,0.3)"
          }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 8px #16a34a" }} />
            ทิศทางที่รายงาน: {activeDirection}
          </span>
          <span className={`mode-pill ${trafficMode}`}>โหมด: {trafficMode.toUpperCase()}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: is4Way ? "repeat(auto-fit, minmax(180px, 1fr))" : "1fr 1fr", gap: "12px", margin: "14px 0" }}>
        {directions.map((d, index) => {
          const isGreen = d.sig === "green";
          const isYellow = d.sig === "yellow";
          return (
            <motion.div 
              key={d.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              style={{
                background: isGreen ? "#f0fdf4" : isYellow ? "#fffbeb" : "#f8fafc",
                border: `2px solid ${isGreen ? "#16a34a" : isYellow ? "#f59e0b" : "#e2e8f0"}`,
                borderRadius: "12px",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                boxShadow: isGreen ? "0 4px 12px rgba(22,163,74,0.15)" : "none",
                transition: "border-color 0.2s, background-color 0.2s"
              }}
            >
              <div className="traffic-light-housing" style={{ transform: "scale(0.85)", transformOrigin: "left center" }}>
                <div className={`signal-lens red ${d.sig === "red" ? "active glow" : ""}`}>
                  <span className="lens-reflection" />
                </div>
                <div className={`signal-lens yellow ${d.sig === "yellow" ? "active glow" : ""}`}>
                  <span className="lens-reflection" />
                </div>
                <div className={`signal-lens green ${d.sig === "green" ? "active glow" : ""}`}>
                  <span className="lens-reflection" />
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>{d.sensor}</div>
                <strong style={{ fontSize: "0.88rem", color: "#0b2338", display: "block" }}>{d.name}</strong>
                <span style={{
                  display: "inline-block",
                  marginTop: "3px",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  color: isGreen ? "#16a34a" : isYellow ? "#d97706" : "#dc2626"
                }}>
                  {isGreen ? "🟢 ไฟเขียว (ผ่านได้)" : isYellow ? "🟡 ไฟเหลือง (ชะลอ)" : d.sig === "red" ? "🔴 ไฟแดง (หยุด)" : "ไม่มีข้อมูลสัญญาณ"}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", borderRadius: "10px", padding: "10px 16px", border: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="countdown-ring" style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#0b2338", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
            <span style={{ fontSize: "1rem", lineHeight: 1 }}>{waitSeconds}</span>
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0b2338" }}>เวลานับถอยหลังของเฟสปัจจุบัน: {waitSeconds} วินาที</div>
            <small style={{ color: "#64748b" }}>จุดติดตั้ง: {device?.location || "ไม่ระบุจุดติดตั้ง"}</small>
          </div>
        </div>

        {data.incident && (
          <div className="incident-alert" style={{ margin: 0 }}>
            <AlertTriangle size={15} /> {data.incident}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// --- STREETLIGHT VISUALIZER ---
export function StreetlightVisualizer({ 
  devices, 
  mode
}: { 
  devices: EventRow[]; 
  mode: "live";
}) {
  const slDevices = devices.filter(d => d.system === "streetlight");
  const onCount = slDevices.filter(d => (d.data as any).on).length;
  const avgBrightness = slDevices.length 
    ? Math.round(slDevices.reduce((acc, d) => acc + ((d.data as any).brightness || 0), 0) / slDevices.length)
    : 0;
  const estPowerKw = (onCount * 0.12 * (avgBrightness / 100)).toFixed(2);
  const estEnergySaved = (slDevices.length * 0.12 * (1 - avgBrightness / 100) * 10).toFixed(1);

  return (
    <motion.div 
      className="visualizer-card streetlight-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
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
        {slDevices.map((d, index) => {
          const dData = (d.data || {}) as any;
          const isOn = dData.on;
          const brightness = dData.brightness || 0;

          return (
            <motion.div 
              key={d.deviceId} 
              className={`light-node ${isOn ? "on" : "off"}`}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
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
            </motion.div>
          );
        })}
      </div>

      <div className="energy-eco-footer">
        <div className="eco-badge">
          <Zap size={16} className="eco-icon" />
          <span>ประหยัดพลังงานสะสมวันนี้: <strong>{estEnergySaved} kWh</strong> (ลด CO₂ ~{(+estEnergySaved * 0.49).toFixed(1)} kg)</span>
        </div>
      </div>
    </motion.div>
  );
}

// --- GATE VISUALIZER ---
export function GateVisualizer({ 
  device, 
  mode
}: { 
  device: EventRow; 
  mode: "live";
}) {
  const data = (device?.data || {}) as any;
  const isOpen = Boolean(data.open);
  const access = data.access;
  const direction = data.direction;
  const cardRef = data.cardRef || "—";

  const [activeTab, setActiveTab] = useState<"visual" | "cards" | "logs">("visual");
  const [cards, setCards] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCardId, setNewCardId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Student");
  const [newStatus, setNewStatus] = useState("allow");
  const [saveMsg, setSaveMsg] = useState("");
  const [readError, setReadError] = useState("");

  const loadRfidData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rfid");
      if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลบัตรและประวัติได้");
      setReadError("");
      const json = await res.json();
      setCards(json.cards || []);
      setLogs(json.logs || []);
    } catch {
      setReadError("ไม่สามารถโหลดข้อมูลบัตรและประวัติได้ กรุณาลองใหม่");
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
    <motion.div 
      className="visualizer-card gate-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {readError && <div role="alert" className="error-bar">{readError}</div>}
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
                transition: "all 0.15s ease",
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
                transition: "all 0.15s ease",
              }}
            >
              บัตร RFID ({cards.length})
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
                transition: "all 0.15s ease",
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

      <AnimatePresence mode="wait">
        {activeTab === "visual" && (
          <motion.div
            key="visual"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="gate-display-area">
              {/* Gate telemetry display */}
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
                    <span>ทิศทาง: <strong>{direction === "in" ? "ขาเข้า (IN)" : direction === "out" ? "ขาออก (OUT)" : "—"}</strong></span>
                    <span className={`access-tag ${access}`}>{access === "granted" ? "✓ อนุญาต (Granted)" : access === "denied" ? "✕ ปฏิเสธ (Denied)" : "ยังไม่มีรายการ"}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "cards" && (
          <motion.div 
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: "1rem 0" }}
          >
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
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0b2338" }}>{c.card_id}</td>
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
          </motion.div>
        )}

        {activeTab === "logs" && (
          <motion.div 
            key="logs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ padding: "1rem 0" }}
          >
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
                        <td style={{ padding: "8px 12px", fontWeight: 700 }}>{lg.card_id}</td>
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- ENVIRONMENT VISUALIZER ---
export function EnvironmentVisualizer({ 
  device, 
  mode
}: { 
  device: EventRow; 
  mode: "live";
}) {
  const data = (device?.data || {}) as any;
  const pm25 = typeof data.pm25 === "number" ? data.pm25 : NaN;
  const temp = typeof data.temperature === "number" ? data.temperature : NaN;
  const humidity = typeof data.humidity === "number" ? data.humidity : NaN;

  if (![pm25, temp, humidity].every(Number.isFinite)) return <div className="empty-state">ยังไม่มีค่าตรวจวัดที่ครบถ้วน</div>;

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
    <motion.div 
      className="visualizer-card env-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
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
          <motion.div className="weather-metric-pill" whileHover={{ x: 2, transition: { duration: 0.15 } }}>
            <Thermometer size={20} className="pill-icon red" />
            <div>
              <span className="pill-label">อุณหภูมิ (Temp)</span>
              <strong>{temp} °C</strong>
            </div>
          </motion.div>

          <motion.div className="weather-metric-pill" whileHover={{ x: 2, transition: { duration: 0.15 } }}>
            <Droplets size={20} className="pill-icon blue" />
            <div>
              <span className="pill-label">ความชื้นสัมพัทธ์ (Humidity)</span>
              <strong>{humidity} %</strong>
            </div>
          </motion.div>

          <motion.div className="weather-metric-pill" whileHover={{ x: 2, transition: { duration: 0.15 } }}>
            <Wind size={20} className="pill-icon cyan" />
            <div>
              <span className="pill-label">ดัชนีความสบาย (Comfort)</span>
              <strong>{temp > 33 ? "ร้อนอบอ้าว" : temp < 26 ? "เย็นสบาย" : "เหมาะสม"}</strong>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
