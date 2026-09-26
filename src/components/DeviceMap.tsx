"use client";
import React, { useEffect, useRef, useState } from "react";
import { deviceHealth, systems, type EventRow } from "@/lib/model";
import { MapPin, Layers, Radio, CarFront, Lightbulb, TrafficCone, DoorOpen, Gauge, Compass } from "lucide-react";

const sysIcons = {
  parking: CarFront,
  traffic: TrafficCone,
  streetlight: Lightbulb,
  gate: DoorOpen,
  environment: Gauge
};

export default function DeviceMap({ devices, mode }: { devices: EventRow[]; mode: "demo" | "live" }) {
  const [viewMode, setViewMode] = useState<"osm" | "twin">("twin");
  const element = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerGroupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<EventRow | null>(null);

  const mapped = devices.filter(d => d.position);

  // Initialize Leaflet OpenStreetMap
  useEffect(() => {
    if (viewMode !== "osm" || !element.current) return;
    let cancelled = false;

    import("leaflet").then(L => {
      if (cancelled || !element.current || mapRef.current) return;
      const initialPoints = mapped.length
        ? mapped.map(d => [d.position!.lat, d.position!.lng] as [number, number])
        : [[13.7563, 100.5018] as [number, number]];

      const map = L.map(element.current, { zoomControl: true, scrollWheelZoom: false }).setView(initialPoints[0], 15);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      mapRef.current = map;
      layerGroupRef.current = layerGroup;

      if (mapped.length > 1) {
        map.fitBounds(L.latLngBounds(initialPoints), { padding: [35, 35], maxZoom: 16 });
      }
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [viewMode]);

  // Update Markers
  useEffect(() => {
    if (viewMode !== "osm" || !mapRef.current || !layerGroupRef.current || !mapped.length) return;
    import("leaflet").then(L => {
      if (!mapRef.current || !layerGroupRef.current) return;
      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();

      for (const d of mapped) {
        const color = deviceHealth(d) === "offline" ? "#8a9aa3" : deviceHealth(d) === "warning" ? "#f59e0b" : "#0db5a3";
        const marker = L.circleMarker([d.position!.lat, d.position!.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 2.5,
          fillColor: color,
          fillOpacity: 0.95
        });

        const popup = document.createElement("div");
        popup.className = "custom-osm-popup";
        const name = document.createElement("strong");
        name.textContent = d.name;
        const detail = document.createElement("p");
        detail.textContent = `${systems[d.system].title} · ${d.location}`;
        const link = document.createElement("a");
        link.href = `/systems/${d.system}`;
        link.textContent = "ดูข้อมูลระบบ →";
        popup.append(name, detail, link);
        marker.bindPopup(popup);

        layerGroup.addLayer(marker);
      }
    });
  }, [mapped.length, mode, viewMode]);

  return (
    <div className="map-container-wrapper">
      {/* Map Header Switcher */}
      <div className="map-view-switcher">
        <button 
          className={`switch-tab ${viewMode === "twin" ? "active" : ""}`}
          onClick={() => setViewMode("twin")}
        >
          <Compass size={15} /> Campus Digital Twin (2.5D Schematic)
        </button>
        <button 
          className={`switch-tab ${viewMode === "osm" ? "active" : ""}`}
          onClick={() => setViewMode("osm")}
        >
          <Layers size={15} /> OpenStreetMap (GIS)
        </button>
      </div>

      {viewMode === "osm" ? (
        <div className="osm-wrap">
          <div className="osm-map" ref={element} />
          {!mapped.length && (
            <div className="map-empty">
              ยังไม่มีพิกัดอุปกรณ์จริง<br />
              <small>ส่ง position.lat และ position.lng ผ่าน API เพื่อแสดงหมุดบนแผนที่</small>
            </div>
          )}
          {mode === "demo" && <span className="map-demo-label">พิกัดสาธิต · ไม่ใช่ตำแหน่งอุปกรณ์จริง</span>}
          <div className="osm-legend">
            <span><i className="legend-dot normal" />ปกติ</span>
            <span><i className="legend-dot warning" />ตรวจสอบ</span>
            <span><i className="legend-dot missing" />ออฟไลน์</span>
          </div>
        </div>
      ) : (
        /* Digital Twin Campus 2.5D Schematic */
        <div className="campus-digital-twin">
          <div className="twin-backdrop">
            {/* Roads & Pathways */}
            <div className="twin-road main-avenue">
              <span className="road-name">ถนนหลักอัสสัมชัญธนบุรี (Main Avenue)</span>
            </div>
            <div className="twin-road cross-street" />

            {/* Campus Zones */}
            <div className="twin-building b-academic-a">
              <div className="b-roof">อาคารเซนต์คาเบรียล (Building A)</div>
              <div className="b-sub">ห้องเรียนมัธยม / Smart Classrooms</div>
            </div>

            <div className="twin-building b-academic-b">
              <div className="b-roof">อาคารเซนต์ไมเคิล (Building B)</div>
              <div className="b-sub">ห้องปฏิบัติการ STEM Lab</div>
            </div>

            <div className="twin-building b-auditorium">
              <div className="b-roof">หอประชุม & ลานกิจกรรม (Grand Hall)</div>
            </div>

            <div className="twin-zone b-football-field">
              <div className="field-grass">
                <span>⚽ สนามกีฬา & ฟุตบอล ACT Stadium</span>
              </div>
            </div>

            <div className="twin-zone b-parking-lot">
              <div className="parking-lot-badge">
                <CarFront size={14} /> ลานจอดรถอัจฉริยะ (P)
              </div>
            </div>

            {/* Live Device Pin Markers */}
            <div className="twin-pins-overlay">
              {devices.map((d, index) => {
                const Icon = sysIcons[d.system] || Radio;
                const health = deviceHealth(d);
                const isSelected = selectedDevice?.deviceId === d.deviceId;

                // Position pins smartly across zones
                const pinCoords: Record<string, { top: string; left: string }> = {
                  "PK-01": { top: "68%", left: "15%" },
                  "PK-02": { top: "68%", left: "22%" },
                  "PK-03": { top: "68%", left: "29%" },
                  "PK-04": { top: "78%", left: "15%" },
                  "PK-05": { top: "78%", left: "22%" },
                  "PK-06": { top: "78%", left: "29%" },
                  "TR-1": { top: "32%", left: "48%" },
                  "TR-2": { top: "52%", left: "76%" },
                  "TR-3": { top: "82%", left: "54%" },
                  "SL-1": { top: "22%", left: "35%" },
                  "SL-2": { top: "25%", left: "62%" },
                  "SL-3": { top: "45%", left: "22%" },
                  "SL-4": { top: "86%", left: "75%" },
                  "GT-1": { top: "88%", left: "42%" },
                  "GT-2": { top: "14%", left: "78%" },
                  "EN-1": { top: "40%", left: "50%" },
                  "EN-2": { top: "58%", left: "85%" }
                };

                const coord = pinCoords[d.deviceId] || { 
                  top: `${25 + (index * 12) % 65}%`, 
                  left: `${20 + (index * 15) % 70}%` 
                };

                return (
                  <div
                    key={d.deviceId}
                    className={`twin-pin sys-${d.system} ${health} ${isSelected ? "selected" : ""}`}
                    style={{ top: coord.top, left: coord.left }}
                    onClick={() => setSelectedDevice(d)}
                  >
                    <span className="pin-pulse" />
                    <span className="pin-core">
                      <Icon size={12} />
                    </span>
                    <span className="pin-tooltip">{d.name} ({d.deviceId})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Device Floating Card */}
          {selectedDevice && (
            <div className="twin-inspect-card">
              <div className="inspect-head">
                <strong>{selectedDevice.name} ({selectedDevice.deviceId})</strong>
                <button onClick={() => setSelectedDevice(null)}>✕</button>
              </div>
              <p>{systems[selectedDevice.system]?.title} · {selectedDevice.location}</p>
              <div className="inspect-foot">
                <span className={`status-tag ${deviceHealth(selectedDevice)}`}>
                  {deviceHealth(selectedDevice) === "normal" ? "● สถานะปกติ" : "▲ ต้องตรวจสอบ"}
                </span>
                <a href={`/systems/${selectedDevice.system}`}>เปิดดูระบบ →</a>
              </div>
            </div>
          )}

          <div className="twin-legend">
            <span className="legend-badge"><span className="dot teal" /> อุปกรณ์ทำงานปกติ</span>
            <span className="legend-badge"><span className="dot amber" /> มีการแจ้งเตือน</span>
            <span className="legend-badge"><span className="dot gray" /> ออฟไลน์</span>
          </div>
        </div>
      )}
    </div>
  );
}
