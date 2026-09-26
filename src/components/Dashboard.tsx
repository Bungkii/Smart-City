"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { 
  Activity, AlertTriangle, ArrowRight, Bell, CarFront, Check, 
  Clock3, DoorOpen, Download, Gauge, Lightbulb, MapPin, Menu, 
  Radio, RefreshCw, Search, Settings2, ShieldCheck, Signal, 
  Sparkles, TrafficCone, X, Zap 
} from "lucide-react";
import { deviceHealth, systems, systemIds, type EventRow, type Health, type SystemId } from "@/lib/model";
import DeviceMap from "./DeviceMap";
import { 
  ParkingVisualizer, TrafficVisualizer, StreetlightVisualizer, 
  GateVisualizer, EnvironmentVisualizer 
} from "./SystemVisualizers";

type Snapshot = { 
  mode: "demo" | "live"; 
  devices: EventRow[]; 
  alerts: { id: number; deviceId: string; name: string; system: SystemId; health: Health; note: string; time: string }[]; 
  history: Record<SystemId, EventRow[]>; 
  serverTime: string;
};

const icons = { 
  parking: CarFront, 
  traffic: TrafficCone, 
  streetlight: Lightbulb, 
  gate: DoorOpen, 
  environment: Gauge 
};

const thaiStatus = { normal: "ปกติ", warning: "ต้องตรวจสอบ", offline: "ออฟไลน์" };
const time = (s?: string) => s ? new Date(s).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "—";
const shortTime = (s?: string) => s ? new Date(s).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

function Status({ value }: { value: Health }) { 
  return <span className={`status ${value}`}><span className="dot" />{thaiStatus[value]}</span>; 
}

function MetricIcon({ id, size = 20 }: { id: SystemId; size?: number }) { 
  const Icon = icons[id]; 
  return <Icon size={size} strokeWidth={1.8} />; 
}

function Shell({ 
  children, 
  active, 
  mode, 
  updated,
  onSimulate
}: { 
  children: React.ReactNode; 
  active?: SystemId | "settings"; 
  mode: "demo" | "live"; 
  updated?: string;
  onSimulate?: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <span className="brand-mark">
            <img src="/act-logo.png" alt="Assumption College Thonburi" />
          </span>
          <span className="brand-text">
            <strong>Assumption College Thonburi</strong>
            <small>SMART CITY DASHBOARD</small>
          </span>
        </Link>

        <div className="side-label">ภาพรวมระบบ</div>
        <Link className={`nav-link ${!active ? "active" : ""}`} href="/" onClick={() => setOpen(false)}>
          <Activity size={18} /> ภาพรวม (Command Center) <ArrowRight className="nav-arrow" size={15} />
        </Link>

        <div className="side-label systems-label">5 ระบบหลัก (Subsystems)</div>
        {systemIds.map(id => (
          <Link key={id} className={`nav-link ${active === id ? "active" : ""}`} href={`/systems/${id}`} onClick={() => setOpen(false)}>
            <MetricIcon id={id} size={18} />
            {systems[id].title}
            <ArrowRight className="nav-arrow" size={15} />
          </Link>
        ))}

        <div className="sidebar-bottom">
          <Link className={`nav-link ${active === "settings" ? "active" : ""}`} href="/settings" onClick={() => setOpen(false)}>
            <Settings2 size={18} /> ตั้งค่าระบบ (Settings) <ArrowRight className="nav-arrow" size={15} />
          </Link>

          <div className="side-help">
            <span className="side-help-icon"><Radio size={16} /></span>
            <div>
              <strong>สถานะการเชื่อมต่อ</strong>
              <p>{mode === "demo" ? "กำลังใช้ข้อมูลจำลอง (Demo)" : "เชื่อมต่ออุปกรณ์จริง (Live)"}</p>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="เมนู">
            {open ? <X /> : <Menu />}
          </button>
          <div className="breadcrumb">
            <span className="breadcrumb-brand">ASSUMPTION COLLEGE THONBURI</span> 
            <span>/</span> 
            {active === "settings" ? "ตั้งค่าระบบ" : active ? systems[active].title : "COMMAND CENTER"}
          </div>

          <div className="top-actions">
            {mode === "demo" && onSimulate && (
              <button className="sim-top-btn" onClick={onSimulate} title="จำลองข้อมูลสุ่มแบบ Real-time">
                <Sparkles size={14} /> จำลองเหตุการณ์สด
              </button>
            )}
            <span className={`mode-badge ${mode}`}>{mode === "demo" ? "DEMO MODE" : "LIVE MODE"}</span>
            <span className="top-updated"><Clock3 size={15} /> {shortTime(updated)}</span>
            <Link href="/settings" aria-label="ตั้งค่า"><Settings2 size={18} /></Link>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}

export default function Dashboard({ systemId, settings = false }: { systemId?: SystemId; settings?: boolean }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      if (!r.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
      setData(await r.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "เกิดข้อผิดพลาด");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSimulate = async (targetDeviceId?: string) => {
    try {
      const res = await fetch("/api/demo/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          system: systemId,
          deviceId: targetDeviceId 
        })
      });
      const result = await res.json();
      if (result.success) {
        showToast(`⚡ ${result.message}`);
        load();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Shell 
      active={settings ? "settings" : systemId} 
      mode={data?.mode || "demo"} 
      updated={data?.serverTime}
      onSimulate={data?.mode === "demo" ? () => handleSimulate() : undefined}
    >
      <div className="content">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="live-toast">
            <Zap size={16} className="toast-icon" />
            <span>{toastMessage}</span>
          </div>
        )}

        {error && (
          <div className="error-bar">
            {error} <button onClick={refresh}>ลองอีกครั้ง</button>
          </div>
        )}

        {!data ? (
          <div className="loading">กำลังเชื่อมต่อข้อมูล Smart City...</div>
        ) : settings ? (
          <Settings data={data} reload={load} />
        ) : systemId ? (
          <SystemDetail 
            id={systemId} 
            data={data} 
            refresh={refresh} 
            refreshing={refreshing} 
            onSimulate={handleSimulate}
          />
        ) : (
          <Overview 
            data={data} 
            refresh={refresh} 
            refreshing={refreshing} 
            onSimulate={handleSimulate}
          />
        )}
      </div>
    </Shell>
  );
}

function PageHeading({ 
  eyebrow, 
  title, 
  description, 
  refresh, 
  refreshing,
  exportData
}: { 
  eyebrow: string; 
  title: string; 
  description: string; 
  refresh?: () => void; 
  refreshing?: boolean;
  exportData?: () => void;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-line" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="head-actions">
        {exportData && (
          <button className="export-btn" onClick={exportData}>
            <Download size={15} /> ส่งออก CSV
          </button>
        )}
        {refresh && (
          <button className="refresh-button" onClick={refresh}>
            <RefreshCw size={15} className={refreshing ? "spin" : ""} /> รีเฟรช
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ id, devices }: { id: SystemId; devices: EventRow[] }) {
  const list = devices.filter(d => d.system === id);
  const healthy = list.filter(d => deviceHealth(d) === "normal").length;
  const value = id === "parking" 
    ? `${list.filter(d => !((d.data as any).occupied)).length} / ${list.length}` 
    : id === "environment" 
      ? (list.length ? `${(list[0].data as any).pm25}` : "—") 
      : `${healthy} / ${list.length}`;
  const label = id === "parking" 
    ? "ช่องว่าง / ทั้งหมด" 
    : id === "environment" 
      ? "PM2.5  µg/m³" 
      : "ทำงานปกติ / ทั้งหมด";
  const flagged = list.some(d => deviceHealth(d) !== "normal");

  return (
    <Link href={`/systems/${id}`} className="summary-card">
      <div className="card-top">
        <span className={`card-icon ${id}`}><MetricIcon id={id} /></span>
        <ArrowRight size={17} className="card-arrow" />
      </div>
      <div className="card-label">{systems[id].title}</div>
      <div className="card-value">{value}</div>
      <div className="card-foot">
        <span>{label}</span>
        <span className={`tiny-indicator ${flagged || !list.length ? "warn" : ""}`}>
          {!list.length ? "ไม่มีข้อมูล" : flagged ? "มีแจ้งเตือน" : "ปกติ"}
        </span>
      </div>
    </Link>
  );
}

function TrendChart({ events, system }: { events: EventRow[]; system: SystemId }) {
  const points = useMemo(() => 
    events
      .filter(e => system === "environment" ? e.deviceId === "EN-1" : e.deviceId === events[0]?.deviceId)
      .slice()
      .reverse()
      .map(e => ({
        time: shortTime(e.recordedAt),
        value: system === "environment" 
          ? (e.data as any).pm25 
          : system === "parking" 
            ? (e.data as any).occupied ? 1 : 0 
            : system === "traffic" 
              ? (e.data as any).waitSeconds 
              : system === "streetlight" 
                ? (e.data as any).brightness 
                : (e.data as any).open ? 1 : 0
      })), 
    [events, system]
  );

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${system}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10bfae" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#10bfae" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e8eef1" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "#8b9aa8", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={30} />
          <YAxis tick={{ fill: "#8b9aa8", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ 
              borderRadius: 12, 
              border: "1px solid #e8eef1", 
              boxShadow: "0 12px 35px #09233c18",
              color: "#183448",
              fontSize: 12
            }} 
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#08b5a4" 
            strokeWidth={3} 
            fill={`url(#area-${system})`} 
            dot={false} 
            isAnimationActive={false} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AlertList({ alerts }: { alerts: Snapshot["alerts"] }) {
  return (
    <div className="alert-list">
      {alerts.length ? (
        alerts.slice(0, 6).map(a => (
          <Link key={a.id} href={`/systems/${a.system}`} className="alert-item">
            <span className={`alert-symbol ${a.health}`}><AlertTriangle size={16} /></span>
            <span className="alert-text">
              <strong>{a.name} ({a.deviceId})</strong>
              <small>{a.note}</small>
            </span>
            <span className="alert-time">{shortTime(a.time)}</span>
          </Link>
        ))
      ) : (
        <div className="empty-state">
          <Check size={20} /> ทุกระบบทำงานในสภาวะปกติ ไม่มีรายการแจ้งเตือน
        </div>
      )}
    </div>
  );
}

function Overview({ 
  data, 
  refresh, 
  refreshing, 
  onSimulate 
}: { 
  data: Snapshot; 
  refresh: () => void; 
  refreshing: boolean;
  onSimulate: (deviceId?: string) => void;
}) {
  const normal = data.devices.filter(d => deviceHealth(d) === "normal").length;
  const warnings = data.alerts.filter(a => a.health === "warning").length;
  const offlines = data.alerts.filter(a => a.health === "offline").length;

  const exportCsv = () => {
    const headers = "ID,System,DeviceID,Name,Location,RecordedAt,Health\n";
    const rows = data.devices.map(d => 
      `"${d.id}","${d.system}","${d.deviceId}","${d.name}","${d.location}","${d.recordedAt}","${d.health}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `act_smartcity_devices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <PageHeading 
        eyebrow="SMART CAMPUS SOC / COMMAND CENTER" 
        title="ศูนย์ควบคุมและสั่งการเมืองอัจฉริยะ" 
        description="ติดตามความปลอดภัย การจราจร พลังงาน และสิ่งแวดล้อมทั่วโรงเรียนอัสสัมชัญธนบุรีแบบ Real-time" 
        refresh={refresh} 
        refreshing={refreshing}
        exportData={exportCsv}
      />

      <div className={`notice ${data.mode}`}>
        <span className="notice-icon"><Radio size={18} /></span>
        <div>
          <strong>{data.mode === "demo" ? "กำลังแสดงข้อมูลสาธิต (Interactive Demo Mode)" : "กำลังแสดงข้อมูลจริง (Live Ingestion Mode)"}</strong>
          <p>{data.mode === "demo" ? "สามารถคลิกสุ่มจำลองเหตุการณ์ หรือทดสอบการทำงานของระบบต่างๆ แบบ Real-time ได้ทันที" : "รับส่งข้อมูลจริงผ่าน Ingestion API หากไม่มีข้อมูลส่งเข้าตามเวลาที่กำหนดจะปรับสถานะเป็นออฟไลน์อัตโนมัติ"}</p>
        </div>
        <Link href="/settings">จัดการโหมด <ArrowRight size={15} /></Link>
      </div>

      {/* Key Metrics Stats Row */}
      <div className="stats-row">
        <div>
          <span>อุปกรณ์ทั้งหมด (Connected)</span>
          <strong>{data.devices.length}</strong>
          <small>ครอบคลุม 5 ระบบหลัก</small>
        </div>
        <div>
          <span>สถานะปกติ (Online)</span>
          <strong className="green-text">{normal}</strong>
          <small className="green-text">● ออนไลน์สมบูรณ์</small>
        </div>
        <div>
          <span>แจ้งเตือน (Warnings)</span>
          <strong className="orange-text">{warnings}</strong>
          <small>รายการต้องตรวจสอบ</small>
        </div>
        <div>
          <span>ขาดการติดต่อ (Offline)</span>
          <strong>{offlines}</strong>
          <small>อุปกรณ์ออฟไลน์</small>
        </div>
      </div>

      {/* Subsystem Cards */}
      <div className="section-title">
        <div>
          <span className="section-kicker">SYSTEM MODULES</span>
          <h2>สถานะ 5 ระบบหลัก</h2>
        </div>
        <span>คลิกที่การ์ดเพื่อเปิดดูรายละเอียด <ArrowRight size={14} /></span>
      </div>

      <div className="summary-grid">
        {systemIds.map(id => (
          <SummaryCard key={id} id={id} devices={data.devices} />
        ))}
      </div>

      {/* Map & Trend Chart */}
      <div className="two-column">
        <section className="panel map-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">CAMPUS DIGITAL TWIN & GIS</span>
              <h2>แผนผังและตำแหน่งอุปกรณ์ (Campus Map)</h2>
            </div>
            <MapPin size={18} />
          </div>
          <DeviceMap devices={data.devices} mode={data.mode} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">AIR QUALITY TELEMETRY</span>
              <h2>แนวโน้มค่าฝุ่น PM2.5 ย้อนหลัง</h2>
            </div>
            <span className="panel-tag">24 ชั่วโมงล่าสุด</span>
          </div>
          <TrendChart events={data.history.environment || []} system="environment" />
          <div className="chart-caption">
            <span><i /> PM2.5 Concentration</span>
            <span>หน่วยมาตรฐาน: µg/m³</span>
          </div>
        </section>
      </div>

      {/* Live Alerts Section */}
      <section className="panel alerts-panel">
        <div className="panel-head">
          <div>
            <span className="section-kicker">INCIDENT MONITORING</span>
            <h2>รายการแจ้งเตือนที่ต้องตรวจสอบ ({data.alerts.length})</h2>
          </div>
          <Bell size={18} />
        </div>
        <AlertList alerts={data.alerts} />
      </section>
    </>
  );
}

function stateText(e: EventRow): string {
  const d: any = e.data;
  switch (e.system) {
    case "parking": return d.occupied ? "ไม่ว่าง (Occupied)" : "ว่าง (Available)";
    case "traffic": return `ไฟ${d.signal === "red" ? "แดง" : d.signal === "green" ? "เขียว" : "เหลือง"} · รอ ${d.waitSeconds} วินาที`;
    case "streetlight": return `${d.on ? "เปิดใช้งาน" : "ปิด"} · ความสว่าง ${d.brightness}%`;
    case "gate": return d.open ? "ไม้กั้นเปิดอยู่ (Open)" : "ไม้กั้นปิด (Closed)";
    case "environment": return `PM2.5 ${d.pm25} µg/m³ · ${d.temperature}°C`;
  }
}

function detailTags(e: EventRow) { 
  const d: any = e.data; 
  switch (e.system) {
    case "parking": return [`ช่องจอด: ${d.bay}`, d.occupied ? "มีรถจอดอยู่" : "ช่องว่างพร้อมจอด"];
    case "traffic": return [`โหมด: ${d.mode}`, d.incident || "การจราจรปกติ"];
    case "streetlight": return [`โหมด: ${d.mode}`, d.fault || "หลอดไฟสมบูรณ์"];
    case "gate": return [d.direction === "in" ? "ทิศทาง: ขาเข้า (IN)" : d.direction === "out" ? "ทิศทาง: ขาออก (OUT)" : "ไม่มีรายการ", d.access === "granted" ? "ผล: อนุญาต (Granted)" : d.access === "denied" ? "ผล: ปฏิเสธ (Denied)" : "—", d.cardRef || "—"];
    case "environment": return [`อุณหภูมิ ${d.temperature}°C`, `ความชื้น ${d.humidity}%`];
  } 
}

function SystemDetail({ 
  id, 
  data, 
  refresh, 
  refreshing,
  onSimulate
}: { 
  id: SystemId; 
  data: Snapshot; 
  refresh: () => void; 
  refreshing: boolean;
  onSimulate: (deviceId?: string) => void;
}) {
  const devices = data.devices.filter(d => d.system === id); 
  const events = data.history[id] || [];
  const [search, setSearch] = useState(""); 
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = devices.filter(d => `${d.name} ${d.deviceId} ${d.location}`.toLowerCase().includes(search.toLowerCase()));
  const selectedDevice = devices.find(d => d.deviceId === selected) || devices[0];
  const latestUpdate = devices.length ? devices.map(d => d.receivedAt).sort().reverse()[0] : undefined;

  return (
    <>
      <PageHeading 
        eyebrow={`SYSTEM / ${systems[id].en.toUpperCase()}`} 
        title={systems[id].title} 
        description={`${systems[id].en} · ควบคุม ตรวจสอบสถานะ และดูข้อมูลย้อนหลังของอุปกรณ์`} 
        refresh={refresh} 
        refreshing={refreshing}
      />

      <div className={`notice compact ${data.mode}`}>
        <Radio size={16} />
        <strong>{data.mode === "demo" ? "โหมดสาธิต (Demo)" : "โหมดข้อมูลจริง (Live)"}</strong>
        <span>อัปเดตล่าสุด: {time(latestUpdate)}</span>
      </div>

      {/* System Interactive Visualizer */}
      {id === "parking" && (
        <ParkingVisualizer devices={data.devices} mode={data.mode} onSimulate={onSimulate} />
      )}
      {id === "traffic" && selectedDevice && (
        <TrafficVisualizer device={selectedDevice} mode={data.mode} onSimulate={onSimulate} />
      )}
      {id === "streetlight" && (
        <StreetlightVisualizer devices={data.devices} mode={data.mode} onSimulate={onSimulate} />
      )}
      {id === "gate" && selectedDevice && (
        <GateVisualizer device={selectedDevice} mode={data.mode} onSimulate={onSimulate} />
      )}
      {id === "environment" && selectedDevice && (
        <EnvironmentVisualizer device={selectedDevice} mode={data.mode} onSimulate={onSimulate} />
      )}

      {/* Detail Stats */}
      <div className="detail-stats">
        <div><span>อุปกรณ์ทั้งหมด</span><strong>{devices.length}</strong></div>
        <div><span>ปกติ (Online)</span><strong className="green-text">{devices.filter(d => deviceHealth(d) === "normal").length}</strong></div>
        <div><span>ต้องตรวจสอบ</span><strong className="orange-text">{devices.filter(d => deviceHealth(d) === "warning").length}</strong></div>
        <div><span>ออฟไลน์</span><strong>{devices.filter(d => deviceHealth(d) === "offline").length}</strong></div>
      </div>

      <div className="detail-layout">
        <section className="panel device-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">DEVICE INVENTORY</span>
              <h2>รายการอุปกรณ์ในระบบ</h2>
            </div>
            <span className="panel-tag">{devices.length} จุด</span>
          </div>

          <label className="search">
            <Search size={16} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="ค้นหาชื่ออุปกรณ์, จุดติดตั้ง หรือรหัส..." 
            />
          </label>

          <div className="device-list">
            {filtered.length ? (
              filtered.map(e => (
                <button 
                  key={e.deviceId} 
                  className={`device-row ${selectedDevice?.deviceId === e.deviceId ? "selected" : ""}`} 
                  onClick={() => setSelected(e.deviceId)}
                >
                  <span className={`device-icon ${id}`}><MetricIcon id={id} size={18} /></span>
                  <span className="device-main">
                    <strong>{e.name}</strong>
                    <small><MapPin size={11} />{e.location} · {e.deviceId}</small>
                  </span>
                  <span className="device-state">
                    <Status value={deviceHealth(e)} />
                    <small>{stateText(e)}</small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))
            ) : (
              <div className="empty-state">ไม่พบอุปกรณ์ที่ค้นหา</div>
            )}
          </div>
        </section>

        <section className="panel focus-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">TELEMETRY INSPECTOR</span>
              <h2>ข้อมูลอุปกรณ์ที่เลือก</h2>
            </div>
            <Signal size={18} />
          </div>

          {selectedDevice ? (
            <>
              <div className="focus-header">
                <span className={`focus-icon ${id}`}><MetricIcon id={id} size={24} /></span>
                <div>
                  <h3>{selectedDevice.name}</h3>
                  <p>{selectedDevice.deviceId} · {selectedDevice.location}</p>
                </div>
              </div>

              <div className="focus-value">{stateText(selectedDevice)}</div>
              <Status value={deviceHealth(selectedDevice)} />

              <div className="detail-tags">
                {detailTags(selectedDevice)?.map((tag, i) => (
                  <span key={i}>{tag}</span>
                ))}
              </div>

              <div className="focus-times">
                <div>
                  <span>เวลาที่อุปกรณ์บันทึก (Recorded):</span>
                  <strong>{time(selectedDevice.recordedAt)}</strong>
                </div>
                <div>
                  <span>ระบบได้รับข้อมูล (Received):</span>
                  <strong>{time(selectedDevice.receivedAt)}</strong>
                </div>
              </div>

              {["gate", "traffic", "streetlight"].includes(id) && (
                <ControlPanel device={selectedDevice} mode={data.mode} />
              )}
            </>
          ) : (
            <div className="empty-state">ยังไม่มีข้อมูลอุปกรณ์</div>
          )}
        </section>
      </div>

      <div className="two-column detail-bottom">
        <section className="panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">HISTORICAL TREND</span>
              <h2>{id === "environment" ? "กราฟ PM2.5 ย้อนหลัง" : id === "traffic" ? "ระยะเวลารอสัญญานไฟ" : id === "streetlight" ? "ระดับความสว่าง" : "แนวโน้มสถานะ"}</h2>
            </div>
            <span className="panel-tag">Telemetry History</span>
          </div>
          <TrendChart events={events} system={id} />
        </section>

        <section className="panel history-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">ACTIVITY LOG</span>
              <h2>ประวัติการเปลี่ยนแปลง</h2>
            </div>
            <Clock3 size={18} />
          </div>
          <div className="history-list">
            {events.slice(0, 8).map(e => (
              <div key={e.id} className="history-row">
                <span className={`history-dot ${deviceHealth(e)}`} />
                <div>
                  <strong>{e.name}</strong>
                  <small>{stateText(e)} · {detailTags(e)?.join(" · ")}</small>
                </div>
                <time>{shortTime(e.receivedAt)}</time>
              </div>
            ))}
            {!events.length && <div className="empty-state">ยังไม่มีประวัติ</div>}
          </div>
        </section>
      </div>
    </>
  );
}

function ControlPanel({ device, mode }: { device: EventRow; mode: "demo" | "live" }) {
  const options = device.system === "gate" 
    ? ["open", "close"] 
    : device.system === "traffic" 
      ? ["adaptive", "fixed", "manual"] 
      : ["auto", "manual", "on", "off"];

  const [command, setCommand] = useState(options[0]);
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setCommand(options[0]);
    setMessage("");
  }, [device.deviceId]);

  const send = async () => {
    if (!confirm(`ยืนยันส่งคำสั่ง ${command} ไปยัง ${device.name}?`)) return;
    try {
      const response = await fetch("/api/control", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          system: device.system,
          deviceId: device.deviceId,
          command,
          reason
        })
      });
      const result = await response.json();
      setMessage(response.ok ? "ส่งคำสั่งแล้ว และบันทึกประวัติแล้ว" : result.error || "ส่งคำสั่งไม่สำเร็จ");
    } catch (e) {
      setMessage("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  return (
    <div className="control-box">
      <div className="control-heading">
        <ShieldCheck size={16} /> ส่งคำสั่งควบคุมอุปกรณ์ (Device Control)
      </div>
      {mode === "demo" ? (
        <p>โหมดสาธิตปิดการส่งคำสั่งตรงไปยังฮาร์ดแวร์จริง หากต้องการใช้งานจริงให้สลับเป็น Live Mode</p>
      ) : (
        <>
          <select value={command} onChange={e => setCommand(e.target.value)}>
            {options.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <input 
            placeholder="เหตุผลในการสั่ง (อย่างน้อย 3 ตัวอักษร)" 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
          />
          <input 
            placeholder="Control Token (จาก .env.local)" 
            type="password" 
            value={token} 
            onChange={e => setToken(e.target.value)} 
          />
          <button disabled={!token || reason.length < 3} onClick={send}>
            ยืนยันและส่งคำสั่งควบคุม
          </button>
          {message && <small>{message}</small>}
        </>
      )}
    </div>
  );
}

function Settings({ data, reload }: { data: Snapshot; reload: () => void }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<any[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  const loadAudit = async () => {
    const r = await fetch("/api/audit", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    if (r.ok) {
      setAudit((await r.json()).items);
      setAuditLoaded(true);
      setMessage("");
    } else {
      setMessage("Settings token ไม่ถูกต้อง");
    }
  };

  const changeMode = async (mode: "demo" | "live") => {
    setBusy(true);
    const r = await fetch("/api/settings", {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ mode })
    });
    const body = await r.json();
    setMessage(r.ok ? `เปลี่ยนเป็น ${mode === "demo" ? "Demo Mode" : "Live Mode"} เรียบร้อยแล้ว` : body.error || "ไม่สามารถเปลี่ยนโหมด");
    setBusy(false);
    if (r.ok) reload();
  };

  return (
    <>
      <PageHeading 
        eyebrow="PREFERENCES / CONFIGURATION" 
        title="ตั้งค่าระบบ & ความปลอดภัย" 
        description="เลือกแหล่งข้อมูล ตรวจสอบความพร้อมในการเชื่อมต่อฮาร์ดแวร์ และดู Security Audit Log" 
      />

      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">DATA SOURCE MODE</span>
              <h2>โหมดการทำงานของระบบ</h2>
            </div>
            <Settings2 size={18} />
          </div>

          <p className="setting-desc">
            <strong>Demo Mode:</strong> ใช้ข้อมูลจำลองและผังเมืองสาธิตเพื่อการทดลองและนำเสนอ<br />
            <strong>Live Mode:</strong> เชื่อมต่อเซนเซอร์จริงผ่าน Ingestion API
          </p>

          <div className="mode-options">
            <button 
              className={data.mode === "demo" ? "chosen" : ""} 
              onClick={() => changeMode("demo")} 
              disabled={busy}
            >
              <span>
                <strong>Demo Mode (ข้อมูลสาธิต)</strong>
                <small>ข้อมูลจำลอง 24 ชม. สำหรับทดลองหน้าจอ</small>
              </span>
              {data.mode === "demo" && <Check size={18} />}
            </button>

            <button 
              className={data.mode === "live" ? "chosen" : ""} 
              onClick={() => changeMode("live")} 
              disabled={busy}
            >
              <span>
                <strong>Live Mode (ข้อมูลจริง)</strong>
                <small>ข้อมูลจริงจากอุปกรณ์ผ่าน REST Ingestion API</small>
              </span>
              {data.mode === "live" && <Check size={18} />}
            </button>
          </div>

          <label className="field-label">
            Settings Token (เพื่อยืนยันสิทธิ์การเปลี่ยนโหมด)
            <input 
              type="password" 
              placeholder="กรอก token จาก .env.local" 
              value={token} 
              onChange={e => setToken(e.target.value)} 
            />
          </label>

          {message && <p className="setting-message">{message}</p>}
        </section>

        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">HARDWARE INTEGRATION</span>
              <h2>ขั้นตอนการเชื่อมต่ออุปกรณ์จริง</h2>
            </div>
            <Radio size={18} />
          </div>

          <div className="integration-step">
            <span>01</span>
            <div>
              <strong>รับข้อมูล Telemetry ผ่าน HTTP</strong>
              <p>POST /api/ingest พร้อม Authorization: Bearer INGEST_TOKEN</p>
            </div>
          </div>

          <div className="integration-step">
            <span>02</span>
            <div>
              <strong>เชื่อมต่อ MQTT Protocol</strong>
              <p>ทำ MQTT Bridge โดย map payload อุปกรณ์เป็น Schema กลางก่อนส่งเข้า Ingest</p>
            </div>
          </div>

          <div className="integration-step">
            <span>03</span>
            <div>
              <strong>ส่งคำสั่งควบคุม (Device Control)</strong>
              <p>ตั้งค่า DEVICE_COMMAND_URL เชื่อมต่อไปยัง Adapter แปลงคำสั่ง</p>
            </div>
          </div>
        </section>
      </div>

      {/* Security Audit Log */}
      <section className="panel audit-panel">
        <div className="panel-head">
          <div>
            <span className="section-kicker">SECURITY & COMPLIANCE</span>
            <h2>บันทึกประวัติคำสั่งควบคุม (Command Audit Log)</h2>
          </div>
          <ShieldCheck size={18} />
        </div>

        <button className="refresh-button" onClick={loadAudit} disabled={!token}>
          โหลดประวัติด้วย Settings Token
        </button>

        {auditLoaded ? (
          audit.length ? (
            <div className="audit-table">
              <div className="audit-row header">
                <span>เวลา</span>
                <span>ผู้สั่ง</span>
                <span>ระบบ / อุปกรณ์</span>
                <span>คำสั่ง</span>
                <span>ผลลัพธ์</span>
              </div>
              {audit.map((a: any) => (
                <div className="audit-row" key={a.id}>
                  <span>{time(a.time)}</span>
                  <span>{a.actor}</span>
                  <span>{a.system} ({a.device_id})</span>
                  <span>{a.command}</span>
                  <span>{a.result}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">ยังไม่มีรายการบันทึกคำสั่ง</div>
          )
        ) : (
          <div className="empty-state">กรอก Settings Token ด้านบนแล้วกดโหลดประวัติ</div>
        )}
      </section>
    </>
  );
}
