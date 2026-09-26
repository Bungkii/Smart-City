"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity, AlertTriangle, ArrowRight, CarFront, Check,
  Clock3, DoorOpen, Download, Gauge, Lightbulb, MapPin, Menu,
  Radio, RefreshCw, Search, Settings2, ShieldCheck, Signal,
  TrafficCone, X, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { Button, Chip, Input, Spinner, Alert } from "@heroui/react";
import { deviceHealth, systems, systemIds, type EventRow, type Health, type SystemId } from "@/lib/model";
import DeviceMap from "./DeviceMap";
import OperationsOverview from "./OperationsOverview";
import {
  ParkingVisualizer, TrafficVisualizer, StreetlightVisualizer,
  GateVisualizer, EnvironmentVisualizer
} from "./SystemVisualizers";

type Snapshot = {
  mode: "live";
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
  const colorMap: Record<Health, "success" | "warning" | "danger"> = {
    normal: "success",
    warning: "warning",
    offline: "danger",
  };
  return (
    <Chip
      size="sm"
      color={colorMap[value]}
      variant="soft"
      className="font-[IBM_Plex_Sans_Thai]"
    >
      {thaiStatus[value]}
    </Chip>
  );
}

function MetricIcon({ id, size = 20 }: { id: SystemId; size?: number }) {
  const Icon = icons[id];
  return <Icon size={size} strokeWidth={1.8} />;
}

function ConnectionChip({ connection }: { connection: "error" | "loading" | "ready" | "empty" }) {
  const label = connection === "error" ? "CONNECTION ERROR" : connection === "loading" ? "CONNECTING" : "DEVICE DATA";
  const color: "danger" | "warning" | "success" = connection === "error" ? "danger" : connection === "loading" ? "warning" : "success";
  return (
    <Chip size="sm" color={color} variant="soft" className="font-[IBM_Plex_Sans_Thai] tracking-widest text-[10px] font-bold">
      {label}
    </Chip>
  );
}

function Shell({
  children,
  active,
  mode,
  updated,
  connection
}: {
  children: React.ReactNode;
  active?: SystemId | "settings";
  mode: "live";
  updated?: string;
  connection: "error" | "loading" | "ready" | "empty";
}) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const mobileToggle = useRef<HTMLButtonElement>(null);
  const closeMobileMenu = useCallback(() => {
    setOpen(false);
    mobileToggle.current?.focus();
  }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("smartcity.sidebar.collapsed") === "true"); } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeMobileMenu]);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("smartcity.sidebar.collapsed", String(next)); } catch {}
  };

  return (
    <div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      {open && <button className="sidebar-backdrop" onClick={closeMobileMenu} aria-label="ปิดเมนูด้านข้าง" />}
      <aside id="main-navigation" aria-label="เมนูหลัก" className={`sidebar ${open ? "open" : ""}`}>
        <button className="sidebar-mobile-close" onClick={closeMobileMenu} aria-label="ปิดเมนู"><X size={18} /></button>
        <Link className="brand" href="/" onClick={() => setOpen(false)}>
          <motion.span 
            className="brand-mark"
            whileHover={{ scale: 1.08, rotate: 3, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/act-logo-1961.png" alt="Assumption College Thonburi — ACT 1961" width={56} height={56} />
          </motion.span>
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
              <p>{connection === "error" ? "เชื่อมต่อข้อมูลไม่สำเร็จ" : connection === "loading" ? "กำลังเชื่อมต่อ" : connection === "empty" ? "รอข้อมูลจากอุปกรณ์" : "อ่านข้อมูลจากฐานข้อมูล"}</p>
            </div>
            <span className={`connection-dot ${connection}`} style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: connection === "ready" ? "#10b981" : connection === "loading" ? "#f59e0b" : "#ef4444",
              boxShadow: connection === "ready" ? "0 0 8px #10b981" : "none",
              animation: connection === "ready" ? "pulse-green 2s infinite" : "none"
            }} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="desktop-nav-toggle" onClick={toggleSidebar} aria-label={collapsed ? "เปิดเมนูด้านข้าง" : "หุบเมนูด้านข้าง"} title={collapsed ? "เปิดเมนูด้านข้าง" : "หุบเมนูด้านข้าง"} aria-expanded={!collapsed} aria-controls="main-navigation">
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button ref={mobileToggle} className="mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? "ปิดเมนู" : "เปิดเมนู"} aria-expanded={open} aria-controls="main-navigation">
            {open ? <X /> : <Menu />}
          </button>
          <Link href="/" className="header-brand" aria-label="ACT 1961 — ภาพรวมเมืองอัจฉริยะ"><img src="/act-logo-1961.png" alt="ACT 1961" width={32} height={32} /></Link>
          <div className="breadcrumb">
            <span className="breadcrumb-brand">ASSUMPTION COLLEGE THONBURI</span>
            <span>/</span>
            {active === "settings" ? "ตั้งค่าระบบ" : active ? systems[active].title : "COMMAND CENTER"}
          </div>

          <div className="top-actions">
            <ConnectionChip connection={connection} />
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

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      if (!r.ok) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่าและเครือข่าย");
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

  return (
    <Shell
      active={settings ? "settings" : systemId}
      mode="live"
      updated={data?.serverTime}
      connection={error ? "error" : !data ? "loading" : data.devices.length ? "ready" : "empty"}
    >
      <div className="content">
        {error && (
          <Alert status="danger" className="mb-4 font-[IBM_Plex_Sans_Thai]">
            <Alert.Title>เกิดข้อผิดพลาดในการเชื่อมต่อ</Alert.Title>
            <Alert.Description>
              {error} {data && "ข้อมูลด้านล่างเป็นข้อมูลที่โหลดสำเร็จครั้งล่าสุด"}
            </Alert.Description>
            <Button size="sm" variant="outline" onPress={refresh} className="mt-2 font-[IBM_Plex_Sans_Thai]">
              ลองอีกครั้ง
            </Button>
          </Alert>
        )}

        {!data ? (
          <div className="loading" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <Spinner size="sm" />
            <span>{error ? "ยังไม่สามารถแสดงข้อมูลอุปกรณ์ได้" : "กำลังเชื่อมต่อข้อมูล Smart City..."}</span>
          </div>
        ) : settings ? (
          <Settings data={data} reload={load} />
        ) : systemId ? (
          <SystemDetail
            id={systemId}
            data={data}
            refresh={refresh}
            refreshing={refreshing}
          />
        ) : (
          <OperationsOverview
            data={data}
            refresh={refresh}
            refreshing={refreshing}
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
          <Button
            size="sm"
            variant="outline"
            onPress={exportData}
            className="font-[IBM_Plex_Sans_Thai] gap-1.5"
          >
            <Download size={14} /> ส่งออก CSV
          </Button>
        )}
        {refresh && (
          <Button
            size="sm"
            variant="outline"
            onPress={refresh}
            className="font-[IBM_Plex_Sans_Thai] gap-1.5"
          >
            <RefreshCw size={14} className={refreshing ? "spin" : ""} /> รีเฟรช
          </Button>
        )}
      </div>
    </div>
  );
}

function TrendChart({ events, system }: { events: EventRow[]; system: SystemId }) {
  const points = useMemo(() =>
    events
      .filter(e => system === "environment" ? e.deviceId === events[0]?.deviceId : e.deviceId === events[0]?.deviceId)
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

  if (!points.length) return <div className="empty-state chart-empty">ยังไม่มีข้อมูลสำหรับแสดงแนวโน้ม</div>;
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
          <Check size={20} /> ไม่มีรายการแจ้งเตือนจากข้อมูลที่ได้รับ
        </div>
      )}
    </div>
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
  refreshing
}: {
  id: SystemId;
  data: Snapshot;
  refresh: () => void;
  refreshing: boolean;
}) {
  const devices = data.devices.filter(d => d.system === id);
  const events = data.history[id] || [];
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = devices.filter(d => `${d.name} ${d.deviceId} ${d.location}`.toLowerCase().includes(search.toLowerCase()));
  const selectedDevice = devices.find(d => d.deviceId === selected) || devices[0];
  const latestUpdate = devices.length ? devices.map(d => d.receivedAt).sort().reverse()[0] : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PageHeading
        eyebrow={`SYSTEM / ${systems[id].en.toUpperCase()}`}
        title={systems[id].title}
        description={`${systems[id].en} · ควบคุม ตรวจสอบสถานะ และดูข้อมูลย้อนหลังของอุปกรณ์`}
        refresh={refresh}
        refreshing={refreshing}
      />

      <div className={`notice compact ${data.mode}`}>
        <Radio size={16} />
        <strong>{"โหมดข้อมูลจริง (Live)"}</strong>
        <span>อัปเดตล่าสุด: {time(latestUpdate)}</span>
      </div>

      {/* System Interactive Visualizer */}
      {id === "parking" && (
        <ParkingVisualizer devices={data.devices} mode={data.mode} />
      )}
      {id === "traffic" && selectedDevice && (
        <TrafficVisualizer device={selectedDevice} mode={data.mode} />
      )}
      {id === "streetlight" && (
        <StreetlightVisualizer devices={data.devices} mode={data.mode} />
      )}
      {id === "gate" && selectedDevice && (
        <GateVisualizer device={selectedDevice} mode={data.mode} />
      )}
      {id === "environment" && selectedDevice && (
        <EnvironmentVisualizer device={selectedDevice} mode={data.mode} />
      )}

      {/* Detail Stats */}
      <motion.div
        className="detail-stats"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div><span>อุปกรณ์ทั้งหมด</span><strong>{devices.length}</strong></div>
        <div><span>ปกติ (Online)</span><strong className="green-text">{devices.filter(d => deviceHealth(d) === "normal").length}</strong></div>
        <div><span>ต้องตรวจสอบ</span><strong className="orange-text">{devices.filter(d => deviceHealth(d) === "warning").length}</strong></div>
        <div><span>ออฟไลน์</span><strong>{devices.filter(d => deviceHealth(d) === "offline").length}</strong></div>
      </motion.div>

      <div className="detail-layout">
        <section className="panel device-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">DEVICE INVENTORY</span>
              <h2>รายการอุปกรณ์ในระบบ</h2>
            </div>
            <span className="panel-tag">{devices.length} จุด</span>
          </div>

          <div className="search" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Search size={16} style={{ color: "#78909e", flex: "none" }} />
            <Input
              value={search}
              onChange={e => setSearch((e.target as HTMLInputElement).value)}
              placeholder="ค้นหาชื่ออุปกรณ์, จุดติดตั้ง หรือรหัส..."
              className="font-[IBM_Plex_Sans_Thai] flex-1"
            />
          </div>

          <div className="device-list">
            {filtered.length ? (
              filtered.map(e => (
                <motion.button
                  key={e.deviceId}
                  className={`device-row ${selectedDevice?.deviceId === e.deviceId ? "selected" : ""}`}
                  onClick={() => setSelected(e.deviceId)}
                  whileHover={{ x: 2, transition: { duration: 0.15 } }}
                  whileTap={{ scale: 0.99 }}
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
                </motion.button>
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
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDevice.deviceId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
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
                    <Chip key={i} size="sm" variant="soft" color="default" className="font-[IBM_Plex_Sans_Thai]">
                      {tag}
                    </Chip>
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

                <ControlPanel device={selectedDevice} mode={data.mode} />
              </motion.div>
            </AnimatePresence>
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
    </motion.div>
  );
}

const systemCommandMap: Record<SystemId, { value: string; label: string; description: string }[]> = {
  gate: [
    { value: "open", label: "🟢 เปิดไม้กั้น (Open Barrier)", description: "ยกแขนกั้นขึ้นให้ยานพาหนะผ่าน" },
    { value: "close", label: "🔴 ปิดไม้กั้น (Close Barrier)", description: "ลดแขนกั้นลงปิดกั้นช่องทาง" },
    { value: "hold_open", label: "⚠️ เปิดค้างฉุกเฉิน (Hold Open)", description: "ยกค้างตลอดเวลาสำหรับกรณีฉุกเฉิน" },
    { value: "lock", label: "🔒 ล็อคไม้กั้นห้ามผ่าน (Lock Down)", description: "ล็อคไม้กั้นไม่ให้เปิดจนกว่าจะปลดล็อค" },
  ],
  traffic: [
    { value: "adaptive", label: "🤖 โหมดปรับตามเซนเซอร์อัตโนมัติ (Adaptive Mode)", description: "ปรับรอบไฟตามปริมาณรถจริงจาก Ultrasonic/PIR" },
    { value: "fixed", label: "⏱️ โหมดจับเวลาคงที่ (Fixed Timer)", description: "สลับสัญญาณไฟตามรอบเวลาคงที่" },
    { value: "manual", label: "🖐️ โหมดควบคุมด้วยตนเอง (Manual Override)", description: "ควบคุมสลับไฟด้วยการสั่งการจากศูนย์" },
    { value: "force_ns_green", label: "⬆️ บังคับไฟเขียวทิศเหนือ-ใต้ (Force N-S Green)", description: "เปิดทางด่วนให้ทิศ N-S ผ่านตลอด" },
    { value: "force_ew_green", label: "➡️ บังคับไฟเขียวทิศตะวันออก-ตก (Force E-W Green)", description: "เปิดทางด่วนให้ทิศ E-W ผ่านตลอด" },
    { value: "force_all_red", label: "🚨 บังคับไฟแดงทุกทิศทางฉุกเฉิน (Emergency All-Red)", description: "หยุดรถทุกฝั่งเมื่อเกิดเหตุฉุกเฉิน" },
    { value: "incident_clear", label: "✅ เคลียร์สถานะอุบัติเหตุ (Clear Incident)", description: "รีเซ็ตสถานะแจ้งเตือนอุบัติเหตุกลับสู่สภาวะปกติ" },
  ],
  streetlight: [
    { value: "auto", label: "☀️ โหมดอัตโนมัติ LDR (Auto Light Sensor)", description: "เปิด-ปิดและปรับความสว่างตามแสงแดดธรรมชาติ" },
    { value: "manual", label: "🖐️ โหมดควบคุมด้วยตนเอง (Manual Override)", description: "ตั้งค่าเปิด-ปิดไฟตามคำสั่งตรงจากศูนย์" },
    { value: "on", label: "💡 เปิดไฟส่องสว่าง (Turn On)", description: "เปิดไฟหลอดส่องสว่างทันที" },
    { value: "off", label: "🌑 ปิดไฟส่องสว่าง (Turn Off)", description: "ปิดไฟหลอดส่องสว่าง" },
    { value: "eco_mode", label: "🌱 โหมดประหยัดพลังงาน Eco (Eco Dimming)", description: "หรี่ไฟเหลือ 30% เมื่อไม่มีคนเดินผ่าน" },
    { value: "dim_50", label: "🌓 หรี่ความสว่าง 50% (Dim to 50%)", description: "ตั้งระดับความสว่างระดับกลาง 50%" },
    { value: "full_100", label: "🌟 ความสว่างเต็มพิกัด 100% (Full Brightness)", description: "เพิ่มความสว่างสูงสุด 100%" },
  ],
  parking: [
    { value: "reset_bay", label: "🔄 รีเซ็ตสถานะช่องจอดทั้งหมด (Reset Bay State)", description: "สั่งรีเซ็ตเซนเซอร์ช่องจอดและอ่านค่าใหม่" },
    { value: "reserve_bay", label: "🏷️ สำรองช่องจอดพิเศษ VIP (Reserve Bay)", description: "ล็อคช่องจอดสำหรับแขกพิเศษหรือผู้บริหาร" },
    { value: "calibrate", label: "📐 ปรับเทียบเซนเซอร์ระยะ Ultrasonic (Calibrate)", description: "ตั้งค่าระยะตรวจจับรถยนต์ของช่องจอดใหม่" },
  ],
  environment: [
    { value: "calibrate", label: "🎯 ปรับเทียบเซนเซอร์ฝุ่น & อุณหภูมิ (Calibrate)", description: "ทำการ Zero-Calibration เซนเซอร์วัดคุณภาพอากาศ" },
    { value: "alert_test", label: "🔔 ทดสอบระบบสัญญาณเตือนภัยฝุ่น (Alarm Test)", description: "ส่งสัญญาณทดสอบ Buzzer/ไฟเตือนเมื่อค่า PM2.5 เกินเกณฑ์" },
    { value: "fan_on", label: "🌀 เปิดพัดลมระบาย/ฟอกอากาศ (Air Purifier Fan ON)", description: "เปิดระบบระบายและฟอกอากาศในพื้นที่" },
    { value: "fan_off", label: "⏹️ ปิดพัดลมระบายอากาศ (Air Purifier Fan OFF)", description: "ปิดระบบฟอกอากาศ" },
  ],
};

function ControlPanel({ device, mode }: { device: EventRow; mode: "live" }) {
  const options = systemCommandMap[device.system] || [];
  const [command, setCommand] = useState(options[0]?.value || "");
  const [reason, setReason] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (options[0]) {
      setCommand(options[0].value);
    }
    setMessage("");
  }, [device.deviceId, device.system]);

  const selectedOption = options.find(o => o.value === command);

  const send = async () => {
    if (!confirm(`ยืนยันส่งคำสั่ง "${selectedOption?.label || command}" ไปยังอุปกรณ์ "${device.name}" (${device.deviceId})?`)) return;
    setLoading(true);
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
      setMessage(response.ok ? "✓ ส่งคำสั่งไปยังบอร์ดฮาร์ดแวร์แล้ว และบันทึกลง Audit Log เรียบร้อย" : "✕ " + (result.error || "ส่งคำสั่งไม่สำเร็จ"));
    } catch (e) {
      setMessage("✕ เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="control-box">
      <div className="control-heading">
        <ShieldCheck size={16} /> ส่งคำสั่งควบคุมอุปกรณ์ (Hardware Command Center)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", display: "block", marginBottom: "4px" }}>
            เลือกคำสั่งควบคุมสำหรับบอร์ด {device.name}:
          </label>
          <select 
            value={command} 
            onChange={e => setCommand(e.target.value)} 
            style={{ 
              width: "100%", 
              padding: "9px 12px", 
              borderRadius: "8px", 
              border: "1px solid #cbd5e1", 
              fontFamily: "'IBM Plex Sans Thai', sans-serif", 
              fontSize: "0.85rem",
              background: "#fff",
              color: "#0f172a"
            }}
          >
            {options.map(x => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          {selectedOption?.description && (
            <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              คำอธิบาย: {selectedOption.description}
            </p>
          )}
        </div>

        <div>
          <Input
            placeholder="ระบุเหตุผลในการสั่งการ (อย่างน้อย 3 ตัวอักษร)"
            value={reason}
            onChange={e => setReason((e.target as HTMLInputElement).value)}
            className="font-[IBM_Plex_Sans_Thai]"
          />
        </div>

        <div>
          <Input
            placeholder="Operator Token (จาก .env.local)"
            type="password"
            value={token}
            onChange={e => setToken((e.target as HTMLInputElement).value)}
            className="font-[IBM_Plex_Sans_Thai]"
          />
        </div>

        <Button
          variant="primary"
          size="sm"
          isDisabled={loading || !token || reason.trim().length < 3}
          onPress={send}
          className="font-[IBM_Plex_Sans_Thai] font-semibold"
          fullWidth
        >
          {loading ? "กำลังส่งคำสั่ง..." : "🚀 ยืนยันและส่งคำสั่งควบคุมบอร์ด"}
        </Button>

        {message && (
          <div style={{ 
            color: message.startsWith("✓") ? "#16a34a" : "#dc2626", 
            background: message.startsWith("✓") ? "#f0fdf4" : "#fef2f2",
            padding: "6px 10px", 
            borderRadius: "6px", 
            fontSize: "0.8rem", 
            fontWeight: 600 
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

function Settings({ data, reload }: { data: Snapshot; reload: () => void }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  const [audit, setAudit] = useState<any[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);

  // Fleet Wi-Fi Sync State
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiMsg, setWifiMsg] = useState("");
  const [savingWifi, setSavingWifi] = useState(false);

  useEffect(() => {
    fetch("/api/settings/wifi")
      .then(r => r.json())
      .then(res => {
        if (res.ssid) setWifiSsid(res.ssid);
        if (res.pass) setWifiPass(res.pass);
      })
      .catch(() => {});
  }, []);

  const saveWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWifi(true);
    try {
      const res = await fetch("/api/settings/wifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ssid: wifiSsid, pass: wifiPass }),
      });
      const json = await res.json();
      if (res.ok) {
        setWifiMsg("✓ บันทึกการตั้งค่า Wi-Fi กลางลง Supabase เรียบร้อยแล้ว");
      } else {
        setWifiMsg("✕ " + (json.error || "เกิดข้อผิดพลาด"));
      }
    } catch {
      setWifiMsg("✕ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSavingWifi(false);
      setTimeout(() => setWifiMsg(""), 4000);
    }
  };

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

  return (
    <>
      <PageHeading
        eyebrow="PREFERENCES / CONFIGURATION"
        title="ตั้งค่าระบบ & ความปลอดภัย"
        description="จัดการการเชื่อมต่อ Wi-Fi และตรวจสอบประวัติการควบคุมอุปกรณ์"
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

          <p className="setting-desc">ระบบรับข้อมูลจากอุปกรณ์จริงเท่านั้น เมื่อยังไม่มีข้อมูล จะแสดงสถานะรอรับข้อมูลโดยไม่สร้างค่าทดแทน</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Settings Token (สำหรับอ่านประวัติการควบคุม)</span>
            <Input
              type="password"
              placeholder="กรอก token จาก .env.local"
              value={token}
              onChange={e => setToken((e.target as HTMLInputElement).value)}
              className="font-[IBM_Plex_Sans_Thai]"
            />
          </div>

          {message && <p className="setting-message">{message}</p>}
        </section>

        {/* Fleet Wi-Fi Provisioning */}
        <section className="panel settings-panel">
          <div className="panel-head">
            <div>
              <span className="section-kicker">FLEET WI-FI SYNC</span>
              <h2>ตั้งค่า Wi-Fi รวมสำหรับทั้ง 5 บอร์ด</h2>
            </div>
            <Radio size={18} />
          </div>

          <p className="setting-desc">
            กำหนดชื่อ Wi-Fi (SSID) และรหัสผ่านกลางสำหรับอุปกรณ์ทุกบอร์ด เมื่อเปิด Hotspot มือถือหรือ Router ตามนี้ บอร์ดทุกตัวจะเชื่อมต่ออัตโนมัติพร้อมกันทันที
          </p>

          <form onSubmit={saveWifi} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>ชื่อ Wi-Fi (SSID 2.4 GHz)</span>
              <Input
                type="text"
                placeholder="เช่น ACT-SmartCity-2.4G หรือชื่อ Hotspot มือถือ"
                value={wifiSsid}
                onChange={e => setWifiSsid((e.target as HTMLInputElement).value)}
                required
                className="font-[IBM_Plex_Sans_Thai]"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>รหัสผ่าน Wi-Fi (Password)</span>
              <Input
                type="text"
                placeholder="เช่น ACT12345678"
                value={wifiPass}
                onChange={e => setWifiPass((e.target as HTMLInputElement).value)}
                className="font-[IBM_Plex_Sans_Thai]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isDisabled={savingWifi}
              className="font-[IBM_Plex_Sans_Thai]"
              fullWidth
            >
              {savingWifi ? "กำลังบันทึก..." : "📶 บันทึก Wi-Fi สำหรับทุกบอร์ด"}
            </Button>
          </form>

          {wifiMsg && (
            <div style={{ color: wifiMsg.startsWith("✓") ? "#16a34a" : "#dc2626", fontSize: "0.85rem", marginTop: "8px", fontWeight: 600 }}>
              {wifiMsg}
            </div>
          )}

          <div style={{ background: "#e8f7f5", border: "1px solid #bfece5", borderRadius: "8px", padding: "10px 12px", marginTop: "12px", fontSize: "0.82rem", color: "#066a60" }}>
            <strong>💡 เคล็ดลับการเชื่อมต่อพร้อมกันทุกบอร์ด:</strong>
            <div style={{ marginTop: "4px" }}>
              เปิด Hotspot มือถือของคุณโดยตั้งชื่อเป็น <code>{wifiSsid}</code> และรหัสผ่าน <code>{wifiPass}</code> จากนั้นเปิดสวิตช์จ่ายไฟให้บอร์ดทั้ง 5 ตัว ทุกบอร์ดจะเชื่อมต่ออินเทอร์เน็ตและส่งข้อมูลเข้า Supabase / Dashboard พร้อมกันทันที!
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

        <Button
          variant="outline"
          size="sm"
          isDisabled={!token}
          onPress={loadAudit}
          className="font-[IBM_Plex_Sans_Thai] mb-3"
        >
          โหลดประวัติด้วย Settings Token
        </Button>

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
