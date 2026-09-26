"use client";
import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { deviceHealth, systems, type EventRow } from "@/lib/model";

export default function DeviceMap({ devices }: { devices: EventRow[]; mode: "live" }) {
  const element = useRef<HTMLDivElement>(null);
  const mapped = devices.filter(d => d.position && Number.isFinite(d.position.lat) && Number.isFinite(d.position.lng));
  useEffect(() => {
    if (!element.current || !mapped.length) return;
    let cancelled = false;
    let map: import("leaflet").Map | undefined;
    import("leaflet").then(L => {
      if (cancelled || !element.current) return;
      map = L.map(element.current, { scrollWheelZoom: false });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19
      }).addTo(map);
      const points: [number, number][] = [];
      for (const device of mapped) {
        const point: [number, number] = [device.position!.lat, device.position!.lng];
        points.push(point);
        const status = deviceHealth(device);
        const popup = document.createElement("div");
        const title = document.createElement("strong"); title.textContent = device.name;
        const detail = document.createElement("p"); detail.textContent = `${systems[device.system].title} · ${device.location}`;
        popup.append(title, detail);
        L.circleMarker(point, { radius: 8, color: "#fff", weight: 2, fillOpacity: 1, fillColor: status === "offline" ? "#64748b" : status === "warning" ? "#b45309" : "#087f72" }).bindPopup(popup).addTo(map);
      }
      map.fitBounds(L.latLngBounds(points), { padding: [35, 35], maxZoom: 16 });
    });
    return () => { cancelled = true; map?.remove(); };
  }, [devices]);
  return <div className="map-container-wrapper">
    {mapped.length ? <div className="osm-map" ref={element} /> : <div className="location-empty"><MapPin size={30} /><strong>ยังไม่มีพิกัดอุปกรณ์</strong><span>แผนที่จะแสดงตำแหน่งเมื่อได้รับพิกัดจากอุปกรณ์จริง</span></div>}
    <div className="location-caption"><span>มีพิกัด {mapped.length} / {devices.length} อุปกรณ์</span><span>ตำแหน่งจากข้อมูลอุปกรณ์</span></div>
  </div>;
}
