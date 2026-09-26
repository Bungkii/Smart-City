# 🏙️ Assumption College Thonburi (ACT) — Smart City IoT Architecture (5 Boards)

แบบจำลองเมืองอัจฉริยะ (Smart City Digital Twin) สถาปัตยกรรมกระจายศูนย์ 5 บอร์ด เชื่อมต่อคลาวด์ **Supabase Cloud Database** และ **Next.js Web Dashboard** แบบ Real-time 100% (ย้ายจากระบบ Google Sheets เดิมโดยสมบูรณ์)

---

## 📌 Architecture & Subsystems (5 บอร์ดระบบย่อย)

### 1. 💳 Board 1: RFID Gate Access & Entry Control (ESP32)
* **Supabase Cloud Authentication:** เมื่อสแกนบัตร RFID RC522 ระบบจะยิงตรงไปค้นหาในตาราง `rfid_cards` บน Supabase ผ่าน REST API (`GET /rest/v1/rfid_cards?card_id=eq.<UID>`) ทันที (Latency < 100ms)
* **Access Control & Action:**
  * **Allow:** ยกไม้กั้น (LED/Servo) 3 วินาที พร้อมส่ง Log เข้าตาราง `gate_logs` และ `events` บน Supabase
  * **Banned:** ปฏิเสธการเข้า เสียง Buzzer แจ้งเตือน และบันทึก Log บัตรถูกระงับ
  * **Not Registered:** แจ้งเตือนบัตรไม่ระบุตัวตนบนจอ LCD 16x2
* **Captive Portal Wi-Fi:** กดปุ่ม `BOOT` เพื่อปล่อย Wi-Fi AP `SmartCity-Gate-AP` (IP `192.168.4.1`) สำหรับตั้งค่า Wi-Fi

### 2. 🚦 Board 2: Adaptive Intersection Traffic Light (ESP32 / UNO R4 WiFi)
* ควบคุมไฟจราจรสี่แยก 2 ทิศทาง (North-South & East-West) ด้วย State Machine
* ปรับเวลาสัญญาณไฟอัตโนมัติตามความหนาแน่น และซิงก์สถานะไฟจราจรขึ้นตาราง `events` บน Supabase

### 3. 🅿️ Board 3: Smart Parking Management (ESP32)
* Ultrasonic ตรวจจับรถเข้า-ออก (IN / OUT) พร้อมคำนวณจำนวนช่องจอดว่าง
* แสดงผลบนจอ OLED SSD1306 (128x64) และส่งข้อมูลที่จอดรถขึ้น Supabase / Dashboard

### 4. 🍃 Board 4: Smart Environment Station (ESP32)
* วัดอุณหภูมิและความชื้น (DHT11) พร้อมระดับควัน/แก๊ส (MQ-2)
* คำนวณค่าประมาณ PM2.5 / ดัชนีคุณภาพอากาศ (AQI) ส่งขึ้น Cloud ทุก 10 วินาที

### 5. 💡 Board 5: Adaptive Street Light System (ESP32)
* ตรวจวัดระดับแสงธรรมชาติ (LDR) และความเคลื่อนไหว (PIR Sensor)
* ปรับระดับความสว่างไฟถนนแบบ Smooth PWM (Dimming) และคำนวณสถิติการประหยัดพลังงาน kWh ส่งขึ้น Supabase

---

## 🗄️ Supabase Cloud Database Tables

| ตาราง (Table) | หน้าที่ | รายละเอียดคอลัมน์ |
| :--- | :--- | :--- |
| **`rfid_cards`** | ข้อมูลบัตร RFID (แทนแท็บ Database ใน Google Sheets) | `card_id`, `name`, `role`, `status` (`allow`/`banned`) |
| **`gate_logs`** | ประวัติการทาบบัตร (แทนแท็บ Logs ใน Google Sheets) | `id`, `card_id`, `name`, `role`, `status`, `action`, `scanned_at` |
| **`events`** | ข้อมูล Telemetry ของทั้ง 5 ระบบย่อย | `source`, `system`, `device_id`, `health`, `data_json`, `position_json` |
| **`settings`** | การตั้งค่าระบบ | `key` (`mode`), `value` (`demo`/`live`) |
| **`command_audit`**| ประวัติคำสั่งควบคุมจาก Dashboard | `actor`, `system`, `device_id`, `command`, `result` |

---

## ⚙️ การตั้งค่า Supabase ในโค้ด Arduino (.ino)

ทุกบอร์ดใช้การตั้งค่า Supabase URL และ Key เดียวกัน:
```cpp
const String SUPABASE_URL = "https://kqkggjsjwbkodqyeddwj.supabase.co/rest/v1";
const String SUPABASE_KEY = "sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc";
```
