# 🔌 WIRE.md — ESP32 Smart City Wiring & Hardware Connection Guide

เอกสารคู่มือการต่อสายไฟ วงจรฮาร์ดแวร์ และการกระจายแรงดันไฟฟ้า (Power Distribution) สำหรับโปรเจกต์ **ESP32 Smart City Model (4 Systems)**

---

## ⚡ 1. Power Distribution & Safety Rules (การกระจายไฟและข้อควรระวัง)

1. **Common Ground (GND ร่วม):** สาย GND ของอุปกรณ์ทุกชิ้น (ESP32, Servo, Relay, Sensors, CD4017BE) ต้องเชื่อมต่อลงบน Ground Rail เดียวกันบน Breadboard ทั้งหมด
2. **แรงดันไฟฟ้า 3.3V vs 5V:**
   * **3.3V Line:** ป้อนเข้าโมดูล **RFID RC522 เท่านั้น** (ห้ามต่อไฟ 5V เข้า RC522 เด็ดขาด โมดูลจะพังทันที)
   * **5V Line:** ป้อนเข้า Servo SG90, Relay Module, HC-SR04, Buzzer, Traffic Light Module และ IC CD4017BE
3. **แหล่งจ่ายไฟ Prototype Phase:** เสียบสาย USB เข้า ESP32 เพื่อรับไฟ 5V จากคอมพิวเตอร์ผ่านพิน **VIN / 5V** กระจายไปยัง Breadboard Power Rail

---

## 📌 2. System-by-System Wiring Diagrams

### 💳 System 1: RFID Gate Access (ไม้กั้นแตะบัตร)
*ประกอบด้วย: RFID RC522 + Servo SG90 + Active Buzzer*

```text
[ RFID RC522 ]            [ ESP32 Dev Board ]
  - SDA (SS)  --------------> GPIO 5
  - SCK       --------------> GPIO 18
  - MOSI      --------------> GPIO 23
  - MISO      --------------> GPIO 19
  - IRQ       --------------> (ไม่ใช้งาน)
  - GND       --------------> GND Rail
  - RST       --------------> GPIO 22
  - 3.3V      --------------> 3.3V Pin (ESP32) ***ห้ามต่อ 5V***

[ Servo SG90 ]            [ ESP32 Dev Board / Power ]
  - Signal (สายสีส้ม) -------> GPIO 13
  - VCC (สายสีแดง) ---------> 5V Rail
  - GND (สายสีน้ำตาล) ------> GND Rail

[ Active Buzzer 5V ]      [ ESP32 Dev Board / Power ]
  - (+) Signal  ------------> GPIO 4
  - (-) Ground  ------------> GND Rail
