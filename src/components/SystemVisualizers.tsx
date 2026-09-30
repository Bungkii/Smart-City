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
import AccessibleSelect from "./ui/AccessibleSelect";
import ConfirmAction from "./ui/ConfirmAction";

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
          const bayName = (d.data as any).bay || d.name || d.deviceId;
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
          <h3>สถานะสัญญาณไฟจราจร 4 ทิศทาง</h3>
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

    </motion.div>
  );
}

// --- GATE VISUALIZER ---
type RfidCard = { card_id: string; name: string; role: string; status: "allow" | "banned"; created_at?: string; updated_at?: string };
type GateLog = { id: number; card_id: string; name: string | null; role: string | null; status: string; action: string; scanned_at: string };

export function GateVisualizer({ 
  device, 
  mode
}: { 
  device?: EventRow;
  mode: "live";
}) {
  const data = (device?.data || {}) as any;
  const gateFresh = Boolean(device && deviceHealth(device) !== "offline");
  const isOpen = gateFresh ? Boolean(data.open) : null;
  const access = gateFresh ? data.access : undefined;
  const direction = gateFresh ? data.direction : undefined;
  const cardRef = gateFresh ? data.cardRef || "—" : "—";

  const [activeTab, setActiveTab] = useState<"visual" | "cards" | "logs">("cards");
  const [cards, setCards] = useState<RfidCard[]>([]);
  const [logs, setLogs] = useState<GateLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [authorized, setAuthorized] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardQuery, setCardQuery] = useState("");
  const [newCardId, setNewCardId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Student");
  const [newStatus, setNewStatus] = useState("banned");
  const [saveMsg, setSaveMsg] = useState("");
  const [readError, setReadError] = useState("");
  const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null);
  const [deletingCard, setDeletingCard] = useState(false);

  const loadRfidData = async (token = adminToken) => {
    if (!token.trim()) {
      setReadError("กรอก RFID Admin Token เพื่ออ่านและจัดการทะเบียนบัตร");
      return false;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/rfid", { headers: { Authorization: `Bearer ${token.trim()}` }, cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "ไม่สามารถโหลดข้อมูลบัตรและประวัติได้");
      setReadError("");
      setAuthorized(true);
      setCards(json.cards || []);
      setLogs(json.logs || []);
      setHasMoreCards(Boolean(json.hasMoreCards));
      return true;
    } catch (error) {
      setAuthorized(false);
      setCards([]);
      setLogs([]);
      setReadError(error instanceof Error ? error.message : "ไม่สามารถโหลดข้อมูลบัตรและประวัติได้");
      return false;
    } finally {
      setLoading(false);
    }
  };
  const [hasMoreCards, setHasMoreCards] = useState(false);

  useEffect(() => {
    if (!authorized || !adminToken.trim()) return;
    const interval = setInterval(() => {
      loadRfidData(adminToken);
    }, 1000);
    return () => clearInterval(interval);
  }, [authorized, adminToken]);

  const lockRegistry = () => {
    setAdminToken("");
    setAuthorized(false);
    setCards([]);
    setLogs([]);
    setReadError("");
    setSaveMsg("");
    setEditingCardId(null);
  };

  const latestScannedUid = (cardRef && cardRef !== "—") ? cardRef : (logs[0]?.card_id || "");

  const handleFillUid = (uid: string) => {
    const existing = cards.find(card => card.card_id === uid);
    if (existing) {
      setEditingCardId(existing.card_id);
      setNewCardId(existing.card_id);
      setNewName(existing.name);
      setNewRole(existing.role);
      setNewStatus(existing.status);
    } else {
      setEditingCardId(null);
      setNewCardId(uid);
      setNewName("");
      setNewRole("Student");
      setNewStatus("banned");
    }
    setActiveTab("cards");
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorized || saving) return;
    const uid = newCardId.trim().toUpperCase();
    if (!/^(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/.test(uid)) {
      setSaveMsg("✕ UID ต้องเป็นเลขฐานสิบหก 8, 14 หรือ 20 ตัวอักษรตามค่าที่อ่านจากบัตรจริง");
      return;
    }
    if (newName.trim().length < 2) {
      setSaveMsg("✕ ระบุชื่อผู้ถือบัตรอย่างน้อย 2 ตัวอักษร");
      return;
    }
    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch(editingCardId ? `/api/rfid?card_id=${encodeURIComponent(editingCardId)}` : "/api/rfid", {
        method: editingCardId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken.trim()}` },
        body: JSON.stringify({
          ...(!editingCardId ? { card_id: uid } : {}),
          name: newName.trim(),
          role: newRole,
          status: newStatus,
        }),
      });
      if (res.ok) {
        const action = editingCardId ? "แก้ไข" : "เพิ่ม";
        setNewCardId("");
        setNewName("");
        setNewStatus("banned");
        setEditingCardId(null);
        const reloaded = await loadRfidData();
        setSaveMsg(`✓ ${action}บัตร ${uid} ในฐานข้อมูลแล้ว${reloaded ? "" : " แต่โหลดทะเบียนล่าสุดไม่สำเร็จ"}`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveMsg("✕ " + (errJson.error || "บันทึกบัตรไม่สำเร็จ"));
      }
    } catch {
      setSaveMsg("✕ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ ยังไม่ยืนยันว่าบันทึกบัตรแล้ว");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCard(true);
    try {
      const res = await fetch(`/api/rfid?card_id=${encodeURIComponent(cardId)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${adminToken.trim()}` },
      });
      if (res.ok) {
        if (editingCardId === cardId) {
          setEditingCardId(null);
          setNewCardId("");
          setNewName("");
          setNewStatus("banned");
        }
        const reloaded = await loadRfidData();
        setSaveMsg(`✓ ลบบัตร ${cardId} จากฐานข้อมูลแล้ว${reloaded ? "" : " แต่โหลดทะเบียนล่าสุดไม่สำเร็จ"}`);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setSaveMsg("✕ ลบไม่สำเร็จ: " + (errJson.error || ""));
      }
    } catch {
      setSaveMsg("✕ เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setDeletingCard(false);
      setPendingDeleteCardId(null);
    }
  };

  const isUidRegistered = (uid: string) => cards.some(c => String(c.card_id).toUpperCase() === String(uid).toUpperCase());
  const filteredCards = cards.filter(card => `${card.card_id} ${card.name} ${card.role}`.toLocaleLowerCase().includes(cardQuery.trim().toLocaleLowerCase()));

  return (
    <motion.div 
      className="visualizer-card gate-viz"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="viz-header">
        <div>
          <span className="viz-tag"><DoorOpen size={14} /> RFID ACCESS CONTROL</span>
          <h3>ทะเบียนบัตรและสิทธิ์เข้าออก</h3>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div className="viz-tab-toggle" style={{ display: "inline-flex", background: "#f0f4f6", padding: "3px", borderRadius: "9px", gap: "3px" }}>
            <Button
              size="sm"
              variant={activeTab === "visual" ? "primary" : "ghost"}
              onPress={() => setActiveTab("visual")}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              สถานะประตู
            </Button>
            <Button
              size="sm"
              variant={activeTab === "cards" ? "primary" : "ghost"}
              onPress={() => { setActiveTab("cards"); if (authorized) void loadRfidData(); }}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              ทะเบียนบัตร ({authorized ? cards.length : "—"})
            </Button>
            <Button
              size="sm"
              variant={activeTab === "logs" ? "primary" : "ghost"}
              onPress={() => { setActiveTab("logs"); if (authorized) void loadRfidData(); }}
              className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3"
            >
              ประวัติการแตะ ({authorized ? logs.length : "—"})
            </Button>
          </div>
          <Chip
            size="sm"
            color={isOpen === null ? "warning" : isOpen ? "success" : "default"}
            variant="soft"
            className="font-[IBM_Plex_Sans_Thai] font-bold"
          >
            {isOpen === null ? device ? "ข้อมูลประตูล้าสมัย" : "ยังไม่มีข้อมูลประตู" : isOpen ? "ไม้กั้นเปิด (OPEN)" : "ไม้กั้นปิด (CLOSED)"}
          </Chip>
        </div>
      </div>

      <div className="rfid-access-bar">
        <div>
          <strong>{authorized ? "ยืนยันสิทธิ์ผู้ดูแลแล้ว" : "ยืนยันสิทธิ์ก่อนจัดการบัตร"}</strong>
          <span>{authorized ? "ข้อมูลบัตรและประวัติดึงจากฐานข้อมูลจริง · token อยู่ในหน่วยความจำของหน้านี้เท่านั้น" : "ใช้ RFID Admin Token ที่ตั้งค่าไว้บนเซิร์ฟเวอร์ ไม่มีการแสดงบัตรตัวอย่าง"}</span>
        </div>
        {authorized ? (
          <Button size="sm" variant="outline" onPress={lockRegistry}>ออกจากทะเบียนบัตร</Button>
        ) : (
          <div className="rfid-access-actions">
            <Input type="password" aria-label="RFID Admin Token" placeholder="RFID Admin Token" value={adminToken} onChange={event => setAdminToken((event.target as HTMLInputElement).value)} />
            <Button size="sm" variant="primary" isDisabled={loading || !adminToken.trim()} onPress={() => void loadRfidData()}>{loading ? "กำลังตรวจสิทธิ์" : "เปิดทะเบียนบัตร"}</Button>
          </div>
        )}
      </div>
      {readError && <div role="alert" className="error-bar rfid-feedback">{readError}</div>}

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
                <div className={`gate-arm ${isOpen === null ? "unknown" : isOpen ? "raised" : "lowered"}`}>
                  <span className="arm-stripes" />
                </div>
                <div className={`rfid-terminal-scanner ${access === "granted" ? "granted" : access === "denied" ? "denied" : "unknown"}`}>
                  <div className="scanner-led" />
                  <Radio size={16} />
                  <small>RFID READER</small>
                </div>
              </div>

              {/* Last confirmed device reading */}
              <div className="gate-reader-info">
                <div className="rfid-scan-summary">
                  <span>ข้อมูลล่าสุดจากเครื่องอ่าน</span>
                  <strong>{cardRef}</strong>
                  <div><span>ทิศทาง</span><b>{direction === "in" ? "ขาเข้า" : direction === "out" ? "ขาออก" : "—"}</b></div>
                  <div><span>ผลการตรวจสิทธิ์</span><b>{access === "granted" ? "อนุญาต" : access === "denied" ? "ปฏิเสธ" : "—"}</b></div>
                  <small>{gateFresh && device ? `รับข้อมูล ${new Date(device.receivedAt).toLocaleString("th-TH")}` : device ? "อุปกรณ์ขาดการติดต่อ ไม่แสดงข้อมูลเก่าเป็นสถานะปัจจุบัน" : "ยังไม่มีข้อมูลจากเครื่องอ่านบัตร"}</small>
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
                  เพิ่มบัตรจริงทีละใบ แก้ไขข้อมูลเดิมโดยไม่เปลี่ยน UID และตรวจสถานะก่อนให้สิทธิ์ผ่านประตู
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                isDisabled={loading || !authorized}
                onPress={() => void loadRfidData()}
                className="font-[IBM_Plex_Sans_Thai] gap-1"
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
              </Button>
            </div>

            {!authorized ? (
              <div className="rfid-locked">ยืนยันสิทธิ์ผู้ดูแลด้านบนเพื่อเปิดทะเบียนบัตรและเพิ่มบัตรเข้าระบบ</div>
            ) : (
              <>
            {hasMoreCards && <div role="status" className="rfid-feedback">แสดงบัตร 500 รายการล่าสุด ยังมีบัตรเพิ่มเติมในฐานข้อมูล</div>}

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
                    UID จาก{cardRef !== "—" ? "เครื่องอ่านล่าสุด" : "ประวัติการสแกน"}: <strong style={{ fontSize: "0.9rem", color: "#0b2338" }}>{latestScannedUid}</strong>
                    {isUidRegistered(latestScannedUid) ? " (ลงทะเบียนแล้ว)" : " (ยังไม่ได้ลงทะเบียน)"}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="font-[IBM_Plex_Sans_Thai] text-xs h-7 px-3 bg-[#0d9488]"
                  onPress={() => handleFillUid(latestScannedUid)}
                >
                  ใช้ UID นี้
                </Button>
              </motion.div>
            )}

            {/* Add / Edit Form */}
            <form onSubmit={handleSaveCard} className="rfid-card-form">
              <div className="rfid-form-heading">
                <div><strong>{editingCardId ? `แก้ไขบัตร ${editingCardId}` : "เพิ่มบัตรเข้าระบบ"}</strong><span>บันทึกลงฐานข้อมูลจริง ตรวจ UID และข้อมูลผู้ถือบัตรก่อนให้สิทธิ์</span></div>
                {editingCardId && <Button size="sm" variant="ghost" onPress={() => { setEditingCardId(null); setNewCardId(""); setNewName(""); setNewRole("Student"); setNewStatus("banned"); }}>ยกเลิกการแก้ไข</Button>}
              </div>
              <div className="rfid-form-field">
                <span>UID บัตรจริง</span>
                <Input
                  aria-label="UID บัตรจริง"
                  placeholder="เลขฐานสิบหกจากเครื่องอ่าน"
                  value={newCardId}
                  onChange={(e) => setNewCardId((e.target as HTMLInputElement).value.replace(/\s/g, "").toUpperCase())}
                  required
                  maxLength={20}
                  disabled={Boolean(editingCardId) || saving}
                  className="font-[IBM_Plex_Sans_Thai]"
                />
              </div>
              <div className="rfid-form-field">
                <span>ชื่อผู้ถือบัตร / สังกัด</span>
                <Input
                  aria-label="ชื่อผู้ถือบัตรหรือสังกัด"
                  placeholder="ชื่อ-นามสกุล / สังกัด"
                  value={newName}
                  onChange={(e) => setNewName((e.target as HTMLInputElement).value)}
                  required
                  maxLength={120}
                  disabled={saving}
                  className="font-[IBM_Plex_Sans_Thai]"
                />
              </div>
              <div className="rfid-form-field"><span>ประเภทผู้ถือบัตร</span>
                <AccessibleSelect label="ประเภทผู้ถือบัตร" value={newRole} onChange={setNewRole} disabled={saving} options={[
                  { value: "Student", label: "นักเรียน" }, { value: "Teacher", label: "ครู" },
                  { value: "Staff", label: "บุคลากร" }, { value: "VIP", label: "ผู้บริหาร" },
                  { value: "Guest", label: "บุคคลภายนอก" },
                ]} />
              </div>
              <div className="rfid-form-field"><span>สิทธิ์ผ่านประตู</span>
                <AccessibleSelect label="สิทธิ์ผ่านประตู" value={newStatus} onChange={setNewStatus} disabled={saving} options={[
                  { value: "banned", label: "ระงับ · ยังไม่อนุญาต" },
                  { value: "allow", label: "อนุญาตผ่านประตู" },
                ]} />
              </div>
              <div className="rfid-form-submit">
                <small>บัตรใหม่เริ่มที่สถานะระงับจนกว่าจะเลือกอนุญาต</small>
                <Button type="submit" variant="primary" size="sm" isDisabled={saving || !newCardId.trim() || newName.trim().length < 2}>
                  {saving ? "กำลังบันทึก..." : editingCardId ? "บันทึกการแก้ไข" : "เพิ่มบัตรเข้าระบบ"}
                </Button>
              </div>
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

            <div className="rfid-list-toolbar">
              <div><strong>บัตรในทะเบียน</strong><span>{filteredCards.length} จาก {cards.length} รายการที่โหลดแล้ว</span></div>
              <Input aria-label="ค้นหาบัตรด้วย UID ชื่อ หรือประเภท" placeholder="ค้นหา UID / ชื่อ / ประเภท" value={cardQuery} onChange={event => setCardQuery((event.target as HTMLInputElement).value)} />
            </div>

            {/* Card Table */}
            <div className="rfid-table-scroll">
              <table style={{ width: "100%", minWidth: "680px", borderCollapse: "collapse", fontSize: "0.82rem" }}>
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
                  {filteredCards.map((c, i) => (
                    <tr key={c.card_id || i} style={{ borderBottom: "1px solid #f0f4f6" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0b2338" }}>{c.card_id}</td>
                      <td style={{ padding: "8px 12px", color: "#1e293b", fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Chip size="sm" variant="soft" color="accent" className="font-[IBM_Plex_Sans_Thai] font-semibold text-xs">
                          {c.role}
                        </Chip>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <Chip size="sm" variant="soft" color={c.status === "allow" ? "success" : "danger"} className="font-[IBM_Plex_Sans_Thai] font-semibold text-xs">
                          {c.status === "allow" ? "อนุญาต" : "ระงับ"}
                        </Chip>
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "4px" }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-[IBM_Plex_Sans_Thai] text-slate-600 hover:text-slate-900"
                            onPress={() => {
                              handleFillUid(c.card_id);
                            }}
                            aria-label="แก้ไขข้อมูลบัตร"
                          >
                            <Edit3 size={13} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs font-[IBM_Plex_Sans_Thai] text-red-500 hover:text-red-700"
                            onPress={() => setPendingDeleteCardId(c.card_id)}
                            aria-label="ลบบัตรนี้"
                          >
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCards.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#94a3b8" }}>
                        {cards.length ? "ไม่พบบัตรตามคำค้นในรายการที่โหลด" : "ยังไม่มีบัตรในระบบ — กรอก UID จากบัตรจริงเพื่อเพิ่ม"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
              </>
            )}
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
                  ประวัติการแตะบัตรล่าสุด
                </h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                  รายการจากฐานข้อมูลจริง 50 รายการล่าสุด ใช้ UID เพื่อเริ่มลงทะเบียนได้
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                isDisabled={loading || !authorized}
                onPress={() => void loadRfidData()}
                className="font-[IBM_Plex_Sans_Thai] gap-1"
              >
                <RefreshCw size={12} className={loading ? "spin" : ""} /> รีเฟรช
              </Button>
            </div>

            {!authorized ? <div className="rfid-locked">ยืนยันสิทธิ์ผู้ดูแลด้านบนเพื่อดูประวัติการแตะบัตร</div> : <div className="rfid-table-scroll">
              <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", fontSize: "0.82rem" }}>
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
                          <td style={{ padding: "8px 12px", fontWeight: 700 }}>{lg.card_id}</td>
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
                                onPress={() => handleFillUid(lg.card_id)}
                              >
                                แก้ไข
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                className="h-6 px-2 text-xs font-[IBM_Plex_Sans_Thai] bg-[#08aa9a]"
                                onPress={() => handleFillUid(lg.card_id)}
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
            </div>}
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmAction
        open={pendingDeleteCardId !== null}
        title="ยืนยันการลบบัตร"
        description={`ลบบัตร UID: ${pendingDeleteCardId ?? ""} ออกจากฐานข้อมูล? การลบมีผลกับสิทธิ์เข้าออกจริง`}
        confirmLabel="ลบบัตร"
        onClose={() => setPendingDeleteCardId(null)}
        onConfirm={() => {
          if (pendingDeleteCardId) void handleDeleteCard(pendingDeleteCardId);
        }}
        busy={deletingCard}
        destructive
      />
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

  if (![temp, humidity].every(Number.isFinite)) return <div className="empty-state">ยังไม่มีค่าอุณหภูมิและความชื้นที่ตรวจวัดได้</div>;

  // Air Quality Level (Thai PCD Criteria)
  let aqiCategory = { label: "ดีมาก (Excellent)", color: "#10b981", class: "good", desc: "คุณภาพอากาศดีมาก เหมาะสำหรับกิจกรรมกลางแจ้ง" };
  if (!Number.isFinite(pm25)) {
    aqiCategory = { label: "ไม่มีข้อมูล PM2.5", color: "#94a3b8", class: "unknown", desc: "สถานีนี้ยังไม่มีเซ็นเซอร์ PM2.5 ที่วัดได้จริง" };
  } else if (pm25 > 75) {
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
          color={aqiCategory.class === "unknown" ? "default" : aqiCategory.class === "good" ? "success" : aqiCategory.class === "warning" || aqiCategory.class === "moderate" ? "warning" : "danger"}
          className="font-[IBM_Plex_Sans_Thai] font-bold"
        >
          {aqiCategory.label}
        </Chip>
      </div>

      <div className="env-metrics-grid">
        {/* Main PM2.5 Radial Card */}
        <div className="pm25-hero-card" style={{ borderColor: `${aqiCategory.color}40` }}>
          <div className="pm25-gauge-circle" style={{ background: "#0b2338" }}>
            <span className="pm25-val" style={{ color: aqiCategory.color }}>{Number.isFinite(pm25) ? pm25 : "—"}</span>
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
              <strong>อุณหภูมิและความชื้นจากเซ็นเซอร์</strong>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

