"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CarFront, TrafficCone, Lightbulb, DoorOpen, Gauge, 
  ShieldCheck, AlertTriangle, CheckCircle2, Zap, Clock, 
  Sparkles, RefreshCw, Send, Radio, UserCheck, Flame, 
  Wind, Droplets, Thermometer, ChevronRight, Activity,
  Trash2, Edit3, PlusCircle, CreditCard, Scan
} from "lucide-react";
import { Button, Chip, Input } from "@heroui/react";
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
          <span className="viz-tag"><CarFront size={14} /> ผังช่องจอดรถ</span>
          <h3>สถานะช่องจอดรถแบบ Real-time</h3>
        </div>
        <div className="viz-stats-pills">
          <span className="pill green" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10b981" }} />
            ว่าง: <strong>{vacantCount}</strong>
          </span>
          <span className="pill red" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ef4444" }} />
            ไม่ว่าง: <strong>{occupiedCount}</strong>
          </span>
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
              whileHover={{ y: -3, scale: 1.02, transition: { duration: 0.18 } }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <div className="bay-roof">
                <span className="bay-id">{bayName}</span>
                <span className={`bay-status-dot ${isOccupied ? "red" : "green"}`} style={{
                  boxShadow: isOccupied ? "0 0 6px rgba(239,68,68,0.6)" : "0 0 6px rgba(16,185,129,0.6)"
                }} />
              </div>
              <div className="bay-visual">
                {isOccupied ? (
                  <motion.div 
                    className="car-model"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CarFront size={30} className="car-icon" />
                    <span className="car-plate">ACT-{100 + index}</span>
                  </motion.div>
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
          <span className="viz-tag"><TrafficCone size={14} /> สัญญาณไฟจราจร</span>
          <h3>สถานะสัญญาณไฟแยกอัสสัมชัญ</h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{
            background: "#f0fdf4",
            color: "#15803d",
            padding: "5px 12px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            border: "1px solid #bbf7d0"
          }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a" }} />
            ทิศทาง: {activeDirection}
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
          <span className="viz-tag"><Lightbulb size={14} /> ระบบไฟส่องสว่าง</span>
          <h3>สถานะไฟส่องสว่างถนน</h3>
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

  useEffect(() => {
    loadRfidData();
  }, []);

  const latestScannedUid = (cardRef && cardRef !== "—") ? cardRef : (logs[0]?.card_id || "");

  const handleFillUid = (uid: string, name = "", role = "Student") => {
    setNewCardId(uid);
    if (name && name !== "บุคคลภายนอก") setNewName(name);
    if (role && role !== "Guest") setNewRole(role);
    setActiveTab("cards");
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardId || !newName) return;
    try {
      const res = await fetch("/api/rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: newCardId.trim().toUpperCase(),
          name: newName.trim(),
          role: newRole,
          status: newStatus,
        }),
      });
      if (res.ok) {
        setSaveMsg(`✓ บันทึกข้อมูลบัตร ${newCardId.trim().toUpperCase()} ลง Supabase สำเร็จ!`);
        setNewCardId("");
        setNewName("");
        loadRfidData();
        setTimeout(() => setSaveMsg(""), 4000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveMsg("✕ เกิดข้อผิดพลาดในการบันทึก: " + (errJson.error || ""));
      }
    } catch {
      setSaveMsg("✕ ไม่สามารถเชื่อมต่อกับ Supabase ได้");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    if (!confirm(`ต้องการลบบัตร UID: ${cardId} ออกจากฐานข้อมูลหรือไม่?`)) return;
    try {
      const res = await fetch(`/api/rfid?card_id=${encodeURIComponent(cardId)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSaveMsg(`✓ ลบบัตร ${cardId} ออกจากระบบเรียบร้อย`);
        loadRfidData();
        setTimeout(() => setSaveMsg(""), 3000);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveMsg("✕ ลบไม่สำเร็จ: " + (errJson.error || ""));
      }
    } catch {
      setSaveMsg("✕ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleToggleStatus = async (card: any) => {
    const nextStatus = card.status === "allow" ? "banned" : "allow";
    try {
      const res = await fetch("/api/rfid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.card_id,
          name: card.name,
          role: card.role,
          status: nextStatus,
        }),
      });
      if (res.ok) {
        setSaveMsg(`✓ เปลี่ยนสถานะบัตร ${card.card_id} เป็น "${nextStatus === "allow" ? "อนุญาต" : "ระงับ"}" เรียบร้อย`);
        loadRfidData();
        setTimeout(() => setSaveMsg(""), 3000);
      }
    } catch {
      setSaveMsg("✕ ไม่สามารถเปลี่ยนสถานะบัตรได้");
    }
  };

  const isUidRegistered = (uid: string) => cards.some(c => String(c.card_id).toUpperCase() === String(uid).toUpperCase());

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
          <span className="viz-tag"><DoorOpen size={14} /> ระบบไม้กั้น & บัตรผ่าน RFID</span>
          <h3>สถานะไม้กั้นและเครื่องอ่านบัตร</h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div className="viz-tab-toggle" style={{ display: "inline-flex", background: "#f0f4f6", padding: "3px", borderRadius: "9px", gap: "3px" }}>
            <Button
              size="sm"
              variant={activeTab === "visual" ? "primary" : "ghost"}
              onPress={() => setActiveTab("visual")}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              ภาพจำลอง & แตะบัตร
            </Button>
            <Button
              size="sm"
              variant={activeTab === "cards" ? "primary" : "ghost"}
              onPress={() => { setActiveTab("cards"); loadRfidData(); }}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              ทะเบียนบัตร ({cards.length})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "logs" ? "primary" : "ghost"}
              onPress={() => { setActiveTab("logs"); loadRfidData(); }}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              ประวัติการแตะ ({logs.length})
            </Button>
          </div>
          <Chip
            size="sm"
            color={isOpen ? "success" : "default"}
            variant="soft"
            className="font-[IBM_Plex_Sans_Thai] font-bold"
          >
            {isOpen ? "ไม้กั้นเปิด (OPEN)" : "ไม้กั้นปิด (CLOSED)"}
          </Chip>
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
                  <small>RFID READER</small>
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
                    <Chip
                      size="sm"
                      color={access === "granted" ? "success" : access === "denied" ? "danger" : "default"}
                      variant="soft"
                      className="font-[IBM_Plex_Sans_Thai]"
                    >
                      {access === "granted" ? "อนุญาต (Granted)" : access === "denied" ? "ปฏิเสธ (Denied)" : "ยังไม่มีรายการ"}
                    </Chip>
                  </div>
                </div>

                {cardRef && cardRef !== "—" && (
                  <div style={{ marginTop: "10px", display: "flex", gap: "8px", justifyContent: "center" }}>
                    <Button
                      size="sm"
                      variant="primary"
                      className="font-[IBM_Plex_Sans_Thai] text-xs gap-1.5 shadow-sm"
                      onPress={() => handleFillUid(cardRef)}
                    >
                      <PlusCircle size={14} /> ลงทะเบียนบัตร UID: {cardRef}
                    </Button>
                  </div>
                )}
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
            style={{ padding: "0.75rem 0" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0b2338", fontWeight: 700 }}>
                  ทะเบียนบัตร RFID ในระบบ
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  ลงทะเบียนบัตรใหม่ แก้ไขสิทธิ์ หรือดึง UID ที่สแกนจากหัวอ่านมาบันทึก
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                isDisabled={loading}
                onPress={loadRfidData}
                className="font-[IBM_Plex_Sans_Thai] gap-1"
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
              </Button>
            </div>

            {/* Quick Auto-Capture Banner */}
            {latestScannedUid && !newCardId && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "#f0fdfa",
                  border: "1px solid #ccfbf1",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  marginBottom: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#0f766e" }}>
                  <Radio size={15} color="#0d9488" />
                  <span>
                    UID ล่าสุดที่ตรวจพบ: <strong style={{ fontFamily: "monospace", fontSize: "0.9rem", color: "#0b2338" }}>{latestScannedUid}</strong>
                    {isUidRegistered(latestScannedUid) ? " (ลงทะเบียนแล้ว)" : " (ยังไม่ได้ลงทะเบียน)"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3 bg-[#0d9488]"
                  onPress={() => handleFillUid(latestScannedUid)}
                >
                  ดึง UID นี้มากรอก
                </Button>
              </motion.div>
            )}

            {/* Add / Edit Form */}
            <form onSubmit={handleSaveCard} style={{ display: "grid", gridTemplateColumns: "1.3fr 1.8fr 1fr 1fr auto", gap: "8px", background: "#f8fafc", padding: "12px", borderRadius: "8px", marginBottom: "1rem", alignItems: "center", border: "1px solid #e2e8f0" }}>
              <div>
                <Input
                  placeholder="UID บัตร (เช่น 4A6F12C3)"
                  value={newCardId}
                  onChange={(e) => setNewCardId((e.target as HTMLInputElement).value)}
                  required
                  className="font-[IBM_Plex_Sans_Thai]"
                />
              </div>
              <div>
                <Input
                  placeholder="ชื่อ-นามสกุล / สังกัด"
                  value={newName}
                  onChange={(e) => setNewName((e.target as HTMLInputElement).value)}
                  required
                  className="font-[IBM_Plex_Sans_Thai]"
                />
              </div>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontFamily: "'IBM Plex Sans Thai', sans-serif", background: "#fff" }}
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
                style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", fontFamily: "'IBM Plex Sans Thai', sans-serif", background: "#fff" }}
              >
                <option value="allow">Allow (อนุญาต)</option>
                <option value="banned">Banned (ระงับ)</option>
              </select>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="font-[IBM_Plex_Sans_Thai] font-semibold"
              >
                บันทึกข้อมูล
              </Button>
            </form>

            {saveMsg && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: saveMsg.startsWith("✓") ? "#16a34a" : "#dc2626", fontSize: "0.84rem", marginBottom: "10px", fontWeight: 600, background: saveMsg.startsWith("✓") ? "#f0fdf4" : "#fef2f2", padding: "6px 12px", borderRadius: "6px" }}
              >
                {saveMsg}
              </motion.div>
            )}

            {/* Card Table */}
            <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid #e1ebed", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e1ebed", textAlign: "left", color: "#546e7a" }}>
                    <th style={{ padding: "9px 12px" }}>Card UID</th>
                    <th style={{ padding: "9px 12px" }}>ชื่อผู้ถือบัตร</th>
                    <th style={{ padding: "9px 12px" }}>ประเภท (Role)</th>
                    <th style={{ padding: "9px 12px" }}>สถานะการผ่าน</th>
                    <th style={{ padding: "9px 12px", textAlign: "right" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map((c, i) => (
                    <tr key={c.card_id || i} style={{ borderBottom: "1px solid #f0f4f6" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0b2338", fontFamily: "monospace" }}>{c.card_id}</td>
                      <td style={{ padding: "8px 12px", color: "#1e293b", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Chip size="sm" variant="soft" color="accent" className="font-[IBM_Plex_Sans_Thai] font-semibold text-xs">
                          {c.role}
                        </Chip>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onPress={() => handleToggleStatus(c)}
                          className="p-0 h-auto cursor-pointer"
                          aria-label="สลับสถานะ อนุญาต / ระงับ"
                        >
                          <Chip
                            size="sm"
                            variant="soft"
                            color={c.status === "allow" ? "success" : "danger"}
                            className="font-[IBM_Plex_Sans_Thai] font-semibold text-xs cursor-pointer hover:opacity-80"
                          >
                            {c.status === "allow" ? "อนุญาต (คลิกเพื่อระงับ)" : "ระงับ (คลิกเพื่อเปิด)"}
                          </Chip>
                        </Button>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-[IBM_Plex_Sans_Thai] text-slate-600 hover:text-slate-900"
                            onPress={() => {
                              setNewCardId(c.card_id);
                              setNewName(c.name);
                              setNewRole(c.role);
                              setNewStatus(c.status);
                            }}
                            aria-label="แก้ไขข้อมูลบัตร"
                          >
                            <Edit3 size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-[IBM_Plex_Sans_Thai] text-red-500 hover:text-red-700"
                            onPress={() => handleDeleteCard(c.card_id)}
                            aria-label="ลบบัตรนี้"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cards.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                        ยังไม่มีข้อมูลบัตรในระบบ — กรอก UID ด้านบนหรือสแกนบัตรที่หัวอ่านเพื่อเพิ่ม
                      </td>
                    </tr>
                  )}
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
            style={{ padding: "0.75rem 0" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", color: "#0b2338", fontWeight: 700 }}>
                  ประวัติการแตะบัตร Real-time
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  สามารถกดปุ่ม "เพิ่มบัตร" เพื่อนำ UID ที่บันทึกไว้เข้าสู่ระบบ
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                isDisabled={loading}
                onPress={loadRfidData}
                className="font-[IBM_Plex_Sans_Thai] gap-1"
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
              </Button>
            </div>

            <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid #e1ebed", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e1ebed", textAlign: "left", color: "#546e7a" }}>
                    <th style={{ padding: "9px 12px" }}>เวลาที่แตะ</th>
                    <th style={{ padding: "9px 12px" }}>Card UID</th>
                    <th style={{ padding: "9px 12px" }}>ผู้ถือบัตร / สังกัด</th>
                    <th style={{ padding: "9px 12px" }}>ทิศทาง</th>
                    <th style={{ padding: "9px 12px" }}>ผลการตรวจสิทธิ์</th>
                    <th style={{ padding: "9px 12px", textAlign: "right" }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length > 0 ? (
                    logs.map((lg, i) => {
                      const registered = isUidRegistered(lg.card_id);
                      return (
                        <tr key={lg.id || i} style={{ borderBottom: "1px solid #f0f4f6" }}>
                          <td style={{ padding: "8px 12px", color: "#64748b" }}>
                            {lg.scanned_at ? new Date(lg.scanned_at).toLocaleTimeString("th-TH") : "-"}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: 700, fontFamily: "monospace" }}>{lg.card_id}</td>
                          <td style={{ padding: "8px 12px" }}>{lg.name || "บุคคลภายนอก"} ({lg.role || "Guest"})</td>
                          <td style={{ padding: "8px 12px" }}>
                            <Chip size="sm" variant="soft" color="default" className="font-[IBM_Plex_Sans_Thai] font-bold text-xs">
                              {lg.action}
                            </Chip>
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <Chip
                              size="sm"
                              variant="soft"
                              color={lg.status === "allow" ? "success" : "danger"}
                              className="font-[IBM_Plex_Sans_Thai] font-semibold text-xs"
                            >
                              {lg.status === "allow" ? "อนุญาต (Granted)" : "ปฏิเสธ (Denied)"}
                            </Chip>
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            {registered ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs font-[IBM_Plex_Sans_Thai] text-slate-600"
                                onPress={() => handleFillUid(lg.card_id, lg.name, lg.role)}
                              >
                                แก้ไข
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                className="h-6 px-2 text-xs font-[IBM_Plex_Sans_Thai] bg-[#08aa9a]"
                                onPress={() => handleFillUid(lg.card_id, lg.name, lg.role)}
                              >
                                <PlusCircle size={12} /> เพิ่มบัตร
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
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
          <span className="viz-tag"><Gauge size={14} /> คุณภาพอากาศ & สภาพอากาศ</span>
          <h3>สถานีตรวจวัดคุณภาพอากาศ (PCD Standard)</h3>
        </div>
        <Chip
          size="sm"
          variant="soft"
          color={aqiCategory.class === "good" ? "success" : aqiCategory.class === "warning" || aqiCategory.class === "moderate" ? "warning" : "danger"}
          className="font-[IBM_Plex_Sans_Thai] font-bold"
        >
          {aqiCategory.label}
        </Chip>
      </div>

      <div className="env-metrics-grid">
        {/* Main PM2.5 Radial Card */}
        <div className="pm25-hero-card" style={{ borderColor: `${aqiCategory.color}40` }}>
          <div className="pm25-gauge-circle" style={{ background: "#0b2338" }}>
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
              <span className="pill-label">อุณหภูมิ (Temperature)</span>
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
              <span className="pill-label">ดัชนีสภาพอากาศ</span>
              <strong>{temp > 33 ? "ร้อนอบอ้าว" : temp < 26 ? "เย็นสบาย" : "เหมาะสม"}</strong>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

