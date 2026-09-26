"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, ArrowUpRight, CarFront, Clock3, DoorOpen, Download, Gauge, Lightbulb, Maximize2, Minimize2, Radio, RefreshCw, Server, ShieldCheck, Thermometer, Droplets, Wind, TrafficCone, WifiOff } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@heroui/react";
import { deviceHealth, systems, systemIds, type EventRow, type SystemId } from "@/lib/model";
import DeviceMap from "./DeviceMap";

type Data = { devices: EventRow[]; history: Record<SystemId, EventRow[]>; serverTime: string };
const icons = { parking: CarFront, traffic: TrafficCone, streetlight: Lightbulb, gate: DoorOpen, environment: Gauge };
const clock = (date?: string) => date ? new Date(date).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";
const stamp = (date?: string) => date ? new Date(date).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : "—";
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("th-TH", { maximumFractionDigits: 1 }) : "—";

function Ring({ value, total, label }: { value: number; total: number; label: string }) {
  const percent = total ? (value / total) * 100 : 0;
  return (
    <div className="monitor-ring">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="49" />
        <circle
          className="ring-value"
          opacity={percent ? 1 : 0}
          cx="60"
          cy="60"
          r="49"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <div>
        <strong>{total ? value : "—"}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, delay: i * 0.06, ease: "easeOut" as const }
  })
};

function SystemPanel({ id, devices, index }: { id: SystemId; devices: EventRow[]; index: number }) {
  const list = devices.filter(d => d.system === id);
  const fresh = list.filter(d => deviceHealth(d) !== "offline");
  const normal = list.filter(d => deviceHealth(d) === "normal").length;
  const state = !list.length ? "empty" : !fresh.length ? "offline" : normal === list.length ? "normal" : "warning";
  const labels = { empty: "รอข้อมูล", offline: "ออฟไลน์", normal: "ปกติ", warning: "ตรวจสอบ" };
  const latest = fresh.slice().sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
  const values = latest?.data as Record<string, unknown> | undefined;
  const Icon = icons[id];
  const free = fresh.filter(d => d.system === "parking" && !d.data.occupied).length;
  const lightsOn = fresh.filter(d => d.system === "streetlight" && d.data.on).length;
  const lastTime = list.map(d => d.receivedAt).sort().at(-1);

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.99 }}
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Link href={`/systems/${id}`} className={`monitor-system ${state}`}>
        <div className="monitor-system-top">
          <span><Icon size={16} /> {systems[id].en}</span>
          <ArrowUpRight size={15} />
        </div>
        <div className="monitor-system-title">
          <h3>{systems[id].title}</h3>
          <span className={`monitor-status ${state}`}><i />{labels[state]}</span>
        </div>
        {id === "parking" ? (
          <>
            <Ring value={free} total={fresh.length} label="ช่องจอดว่าง" />
            <div className="monitor-pair">
              <span>มีรถจอด <b>{fresh.length ? fresh.length - free : "—"}</b></span>
              <span>ทั้งหมด <b>{list.length || "—"}</b></span>
            </div>
          </>
        ) : id === "streetlight" ? (
          <>
            <Ring value={lightsOn} total={fresh.length} label="จุดที่เปิดไฟ" />
            <div className="monitor-pair">
              <span>ปิดไฟ <b>{fresh.length ? fresh.length - lightsOn : "—"}</b></span>
              <span>ทั้งหมด <b>{list.length || "—"}</b></span>
            </div>
          </>
        ) : id === "traffic" ? (
          <>
            <div className="monitor-traffic" aria-label={values ? `สัญญาณล่าสุด ${values.signal}` : "ยังไม่มีข้อมูลสัญญาณ"}>
              {["red", "yellow", "green"].map(signal => (
                <i key={signal} className={values?.signal === signal ? signal : ""} />
              ))}
            </div>
            <div className="monitor-pair">
              <span>เวลารอ <b>{number(values?.waitSeconds)} <small>วินาที</small></b></span>
              <span>โหมด <b>{String(values?.mode ?? "—")}</b></span>
            </div>
            <small className="monitor-selection">{latest?.deviceId ?? "ยังไม่มีสัญญาณจากอุปกรณ์"}</small>
          </>
        ) : id === "gate" ? (
          <>
            <div className="monitor-gate">
              <DoorOpen size={42} strokeWidth={1.3} />
              <strong>{!values ? "—" : values.open ? "เปิด" : "ปิด"}</strong>
              <span>สถานะประตูล่าสุด</span>
            </div>
            <div className="monitor-pair">
              <span>ผลอ่านบัตร <b>{values?.access === "granted" ? "อนุญาต" : values?.access === "denied" ? "ปฏิเสธ" : "—"}</b></span>
              <span>อุปกรณ์ <b>{latest?.deviceId ?? "—"}</b></span>
            </div>
          </>
        ) : (
          <>
            <div className="monitor-air">
              <strong>{number(values?.pm25)}</strong>
              <span>PM2.5 <small>µg/m³</small></span>
            </div>
            <div className="monitor-pair">
              <span>อุณหภูมิ <b>{number(values?.temperature)} <small>°C</small></b></span>
              <span>ความชื้น <b>{number(values?.humidity)} <small>%</small></b></span>
            </div>
            <small className="monitor-selection">{latest?.deviceId ?? "ยังไม่มีค่าตรวจวัด"}</small>
          </>
        )}
        <div className="monitor-system-foot">
          <span>รับข้อมูล {clock(lastTime)}</span>
          <span>{fresh.length}/{list.length} ออนไลน์</span>
        </div>
      </Link>
    </motion.div>
  );
}

export default function OperationsOverview({ data, refresh, refreshing }: { data: Data; refresh: () => void; refreshing: boolean }) {
  const [wallMode, setWallMode] = useState(false);
  const stations = data.devices.filter(d => d.system === "environment");
  const [station, setStation] = useState("");
  const selectedStation = stations.find(d => d.deviceId === station)?.deviceId ?? stations[0]?.deviceId;
  const weatherDevice = stations.find(d => d.deviceId === selectedStation);
  const weather = weatherDevice?.system === "environment" && deviceHealth(weatherDevice) !== "offline" ? weatherDevice.data : undefined;
  const online = data.devices.filter(d => deviceHealth(d) !== "offline").length;
  const warning = data.devices.filter(d => deviceHealth(d) === "warning").length;
  const offline = data.devices.length - online;
  const points = useMemo(() => (data.history.environment ?? []).filter(e => e.deviceId === selectedStation && e.system === "environment").slice().reverse().map(e => ({ time: clock(e.recordedAt), value: e.system === "environment" ? e.data.pm25 : undefined })), [data.history, selectedStation]);
  const recent = useMemo(() => Object.values(data.history).flat().sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt)).slice(0, 6), [data.history]);
  const latest = data.devices.map(d => d.receivedAt).sort().at(-1);

  const exportCsv = () => {
    const quote = (v: unknown) => `"${String(v ?? "").replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
    const rows = [["Device", "System", "Name", "Location", "Status", "Received at"], ...data.devices.map(d => [d.deviceId, d.system, d.name, d.location, deviceHealth(d), d.receivedAt])];
    const url = URL.createObjectURL(new Blob(["\ufeff" + rows.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `smartcity-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <motion.div 
      className={`monitor-board ${wallMode ? "wall-mode" : ""}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      <header className="monitor-heading">
        <div>
          <div className="monitor-eyebrow"><span /> ACT SMART CAMPUS · OPERATIONS CENTER</div>
          <h1>ภาพรวมเมืองอัจฉริยะ</h1>
          <p>ติดตามสภาพอากาศและสถานะการทำงานของเมืองในหน้าเดียว</p>
        </div>
        <div className="monitor-toolbar">
          <div className="monitor-clock">
            <Clock3 size={14} />
            <span>{stamp(data.serverTime)}<small>ตรวจสอบข้อมูลทุก 5 วินาที</small></span>
          </div>
          <Button isIconOnly size="sm" variant="outline" isDisabled={refreshing} onPress={refresh} aria-label="รีเฟรชข้อมูล">
            <RefreshCw size={15} className={refreshing ? "spin" : ""} />
          </Button>
          <Button isIconOnly size="sm" variant="outline" isDisabled={!data.devices.length} onPress={exportCsv} aria-label="ส่งออกข้อมูล CSV">
            <Download size={15} />
          </Button>
          <Button isIconOnly size="sm" variant="outline" onPress={() => setWallMode(!wallMode)} aria-label={wallMode ? "ออกจากมุมมองจอมอนิเตอร์" : "ขยายมุมมองจอมอนิเตอร์"}>
            {wallMode ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </Button>
        </div>
      </header>

      <div className="monitor-kpis">
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.15 } }}
        >
          <span className="monitor-kpi-icon"><Server size={21} /></span>
          <span>อุปกรณ์ที่รายงานข้อมูล<small>REGISTERED IN TELEMETRY</small></span>
          <strong>{data.devices.length}<small>อุปกรณ์</small></strong>
        </motion.div>
        <motion.div
          className="online"
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.15 } }}
        >
          <span className="monitor-kpi-icon"><Activity size={21} /></span>
          <span>เชื่อมต่ออยู่<small>ONLINE DEVICES</small></span>
          <strong>{online}<small>อุปกรณ์</small></strong>
        </motion.div>
        <motion.div
          className="warning"
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.15 } }}
        >
          <span className="monitor-kpi-icon"><ShieldCheck size={21} /></span>
          <span>ต้องตรวจสอบ<small>ACTIVE WARNINGS</small></span>
          <strong>{warning}<small>รายการ</small></strong>
        </motion.div>
        <motion.div
          className="offline"
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          whileHover={{ y: -3, scale: 1.01, transition: { duration: 0.15 } }}
        >
          <span className="monitor-kpi-icon"><WifiOff size={21} /></span>
          <span>ขาดการติดต่อ<small>OFFLINE DEVICES</small></span>
          <strong>{offline}<small>อุปกรณ์</small></strong>
        </motion.div>
      </div>

      <motion.section 
        className="city-weather" 
        aria-label="สภาพอากาศปัจจุบัน"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <div className="city-weather-heading">
          <span className="city-weather-icon"><Wind size={24} /></span>
          <div>
            <small>ENVIRONMENT NOW</small>
            <h2>สภาพอากาศตอนนี้</h2>
            <span>{weatherDevice?.name ?? "รอข้อมูลจากสถานีตรวจวัด"}</span>
            <small>{weather ? "ข้อมูลล่าสุด " + stamp(weatherDevice?.receivedAt) : weatherDevice ? "สถานีขาดการติดต่อ · ไม่แสดงค่าเก่าเป็นค่าปัจจุบัน" : "ยังไม่มีค่าตรวจวัดจริง"}</small>
          </div>
        </div>
        <div className="city-weather-metric">
          <span><Gauge size={15} /> ฝุ่น PM2.5</span>
          <strong>{number(weather?.pm25)} <small>µg/m³</small></strong>
          <span>ค่าฝุ่นจากสถานีที่เลือก</span>
        </div>
        <div className="city-weather-metric">
          <span><Thermometer size={15} /> อุณหภูมิ</span>
          <strong>{number(weather?.temperature)} <small>°C</small></strong>
          <span>อุณหภูมิจากเซนเซอร์</span>
        </div>
        <div className="city-weather-metric">
          <span><Droplets size={15} /> ความชื้น</span>
          <strong>{number(weather?.humidity)} <small>%</small></strong>
          <span>ความชื้นสัมพัทธ์</span>
        </div>
      </motion.section>

      <div className="monitor-section-label">
        <h2><Radio size={15} /> สถานะระบบ / SYSTEM STATUS</h2>
        <span>ค่าปัจจุบันจากอุปกรณ์ที่ยังส่งข้อมูล</span>
      </div>

      <div className="monitor-systems">
        {systemIds.map((id, index) => (
          <SystemPanel key={id} id={id} devices={data.devices} index={index} />
        ))}
      </div>

      {!data.devices.length && (
        <motion.div 
          className="monitor-waiting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Radio size={17} />
          <strong>รอรับข้อมูลจากอุปกรณ์จริง</strong>
          <span>ยังไม่มีข้อมูลที่ยืนยันได้ · ตรวจสอบการเชื่อมต่อของอุปกรณ์และการตั้งค่ารับข้อมูล</span>
          <Link href="/settings">ตั้งค่าระบบ <ArrowUpRight size={14} /></Link>
        </motion.div>
      )}

      <motion.div 
        className="monitor-bottom"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2 }}
      >
        <section className="monitor-panel monitor-chart">
          <div className="monitor-panel-heading">
            <div><small>ENVIRONMENT HISTORY</small><h2>แนวโน้มคุณภาพอากาศ</h2></div>
            <span>PM2.5 · µg/m³</span>
          </div>
          <div className="monitor-chart-tools">
            <span>ข้อมูลย้อนหลังที่ได้รับล่าสุด</span>
            <select aria-label="เลือกสถานีตรวจวัด" value={selectedStation ?? ""} onChange={e => setStation(e.target.value)} disabled={!stations.length}>
              {stations.length ? stations.map(d => <option key={d.deviceId} value={d.deviceId}>{d.name}</option>) : <option value="">ยังไม่มีสถานี</option>}
            </select>
          </div>
          <div className="monitor-chart-area">
            {points.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={points} margin={{ top: 12, right: 10, left: -22, bottom: 0 }}>
                  <defs>
                    <linearGradient id="monitor-air-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3dc8f5" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="#3dc8f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e3eaf0" vertical={false} strokeDasharray="3 4" />
                  <XAxis dataKey="time" tick={{ fill: "#6b8094", fontSize: 10 }} minTickGap={35} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8c9fb5", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #dbe4ed", color: "#253c52", fontSize: 12 }} />
                  <Area type="linear" dataKey="value" name="PM2.5" stroke="#3dc8f5" strokeWidth={2} fill="url(#monitor-air-fill)" isAnimationActive={false} dot={points.length === 1} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="monitor-no-chart">
                <div className="monitor-chart-grid" />
                <Gauge size={27} />
                <strong>ยังไม่มีข้อมูลแนวโน้ม</strong>
                <span>กราฟจะแสดงเมื่อได้รับค่าตรวจวัดจริง</span>
              </div>
            )}
          </div>
        </section>

        <section className="monitor-panel monitor-map">
          <div className="monitor-panel-heading">
            <div><small>DEVICE LOCATIONS</small><h2>ตำแหน่งอุปกรณ์</h2></div>
            <span>พิกัดที่ได้รับจริง</span>
          </div>
          <DeviceMap devices={data.devices} mode="live" />
        </section>

        <section className="monitor-panel monitor-events">
          <div className="monitor-panel-heading">
            <div><small>TELEMETRY LOG</small><h2>ข้อมูลรับเข้าล่าสุด</h2></div>
            <span>{recent.length} รายการ</span>
          </div>
          {recent.length ? (
            <div className="monitor-log">
              {recent.map(e => (
                <Link href={`/systems/${e.system}`} key={`${e.system}-${e.id}`}>
                  <span className={`monitor-log-dot ${deviceHealth(e)}`} />
                  <div>
                    <strong>{e.name}</strong>
                    <small>{e.deviceId} · {systems[e.system].title}</small>
                  </div>
                  <time title={stamp(e.receivedAt)}>{clock(e.receivedAt)}</time>
                </Link>
              ))}
            </div>
          ) : (
            <div className="monitor-log-empty">
              <Server size={27} />
              <strong>ยังไม่มีข้อมูลรับเข้า</strong>
              <span>ระบบจะบันทึกรายการเมื่ออุปกรณ์ส่งข้อมูล</span>
            </div>
          )}
        </section>
      </motion.div>

      <footer className="monitor-footer">
        <span><ShieldCheck size={13} /> DEVICE TELEMETRY ONLY</span>
        <span>ข้อมูลอุปกรณ์ล่าสุด: {stamp(latest)}</span>
        <span>ASSUMPTION COLLEGE THONBURI</span>
      </footer>
    </motion.div>
  );
}
