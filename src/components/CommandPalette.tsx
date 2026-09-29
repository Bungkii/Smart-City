"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Activity,
  Layers,
  Settings2,
  Car,
  Lightbulb,
  ShieldCheck,
  ThermometerSun,
  Radio,
  ArrowRight,
  CornerDownLeft,
  X
} from "lucide-react";
import { systems } from "@/lib/model";

interface CommandItem {
  id: string;
  title: string;
  subtitle: string;
  category: "ภาพรวม" | "ระบบย่อย" | "ตั้งค่า";
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items: CommandItem[] = useMemo(() => [
    {
      id: "overview",
      title: "ภาพรวมเมืองอัจฉริยะ (Command Center)",
      subtitle: "ศูนย์ควบคุมและสถานะภาพรวมทั้งหมด",
      category: "ภาพรวม",
      href: "/",
      icon: Activity,
    },
    {
      id: "parking",
      title: systems.parking.title,
      subtitle: systems.parking.en,
      category: "ระบบย่อย",
      href: "/systems/parking",
      icon: Car,
    },
    {
      id: "traffic",
      title: systems.traffic.title,
      subtitle: systems.traffic.en,
      category: "ระบบย่อย",
      href: "/systems/traffic",
      icon: Layers,
    },
    {
      id: "streetlight",
      title: systems.streetlight.title,
      subtitle: systems.streetlight.en,
      category: "ระบบย่อย",
      href: "/systems/streetlight",
      icon: Lightbulb,
    },
    {
      id: "gate",
      title: systems.gate.title,
      subtitle: systems.gate.en,
      category: "ระบบย่อย",
      href: "/systems/gate",
      icon: ShieldCheck,
    },
    {
      id: "environment",
      title: systems.environment.title,
      subtitle: systems.environment.en,
      category: "ระบบย่อย",
      href: "/systems/environment",
      icon: ThermometerSun,
    },
    {
      id: "settings",
      title: "ตั้งค่าระบบ (System Settings)",
      subtitle: "จัดการเครือข่าย Wi-Fi, สิทธิ์ผู้ดูแล และความปลอดภัย",
      category: "ตั้งค่า",
      href: "/settings",
      icon: Settings2,
    },
  ], []);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [items, query]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const selectItem = (item: CommandItem) => {
    onClose();
    router.push(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems.length > 0) {
      e.preventDefault();
      selectItem(filteredItems[selectedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="spotlight-overlay" onClick={onClose}>
          <motion.div
            className="spotlight-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: -15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -15 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
          >
            <div className="spotlight-header">
              <Search className="spotlight-search-icon" size={18} />
              <input
                ref={inputRef}
                type="text"
                className="spotlight-input"
                placeholder="ค้นหาระบบย่อย, แดชบอร์ด หรือการตั้งค่า..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              {query && (
                <button
                  type="button"
                  className="spotlight-clear-btn"
                  onClick={() => setQuery("")}
                  aria-label="ล้างคำค้นหา"
                >
                  <X size={15} />
                </button>
              )}
              <kbd className="spotlight-kbd">ESC</kbd>
            </div>

            <div className="spotlight-body">
              {filteredItems.length === 0 ? (
                <div className="spotlight-empty">
                  <Radio size={24} className="spotlight-empty-icon" />
                  <p>ไม่พบรายการที่ตรงกับ &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                <div className="spotlight-list">
                  {filteredItems.map((item, index) => {
                    const Icon = item.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        className={`spotlight-item ${isSelected ? "selected" : ""}`}
                        onMouseEnter={() => setSelectedIndex(index)}
                        onClick={() => selectItem(item)}
                      >
                        <div className="spotlight-item-icon">
                          <Icon size={18} />
                        </div>
                        <div className="spotlight-item-content">
                          <div className="spotlight-item-title">
                            {item.title}
                            <span className="spotlight-badge">{item.category}</span>
                          </div>
                          <div className="spotlight-item-subtitle">{item.subtitle}</div>
                        </div>
                        <div className="spotlight-item-enter">
                          {isSelected ? (
                            <CornerDownLeft size={14} />
                          ) : (
                            <ArrowRight size={14} className="spotlight-arrow" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="spotlight-footer">
              <div className="spotlight-shortcuts-hint">
                <span>
                  <kbd className="spotlight-mini-kbd">↑</kbd>
                  <kbd className="spotlight-mini-kbd">↓</kbd> นำทาง
                </span>
                <span>
                  <kbd className="spotlight-mini-kbd">↵</kbd> เปิด
                </span>
                <span>
                  <kbd className="spotlight-mini-kbd">Esc</kbd> ปิด
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
