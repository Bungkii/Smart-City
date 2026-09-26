# 🏫 Assumption College Thonburi (ACT) — Smart City Dashboard

ระบบบริหารจัดการและแดชบอร์ดเมืองอัจฉริยะ **Assumption College Thonburi (ACT)** พัฒนาด้วย **Next.js 16 (App Router + Turbopack)**, **TypeScript**, **PostgreSQL (Supabase Cloud)** พร้อมเชื่อมต่อฮาร์ดแวร์จริงทั้ง 5 บอร์ดผ่าน **WiFiManager** และ **Supabase REST / Realtime API**

---

## 🌟 ฟีเจอร์เด่นของระบบ (Key Features)

1. **Dashboard แสดงผลแบบเรียลไทม์ (Live Telemetry)**:
   - 🚗 **ที่จอดรถอัจฉริยะ (Smart Parking)**: ตรวจจับรถเข้า-ออก แสดงสถานะช่องจอดและคำนวณที่ว่าง
   - 🚦 **สัญญาณไฟจราจรสี่แยก (4-Way Adaptive Traffic Light)**: แยกเสาสัญญาณ 4 ทิศทาง (เหนือ, ตะวันออก, ใต้, ตะวันตก) พร้อมระบบตรวจจับรถด้วย Ultrasonic และ PIR เพื่อยืดเวลาไฟเขียวอัตโนมัติ
   - 💡 **ไฟถนนอัจฉริยะ (Adaptive Street Lights)**: เซนเซอร์แสง LDR ตรวจกลางวัน/กลางคืน และ PIR ปรับหรี่-สว่างอัตโนมัติแบบ PWM Smooth Fade
   - 🚪 **ระบบประตู RFID Gate**: สแกนบัตรนักเรียน/ครู ตรวจสอบสิทธิ์และบันทึกประวัติการผ่านประตูลงฐานข้อมูลแบบเรียลไทม์
   - 🌿 **สถานีตรวจวัดสภาพแวดล้อม (Environment Station)**: ตรวจจับ PM2.5, อุณหภูมิ, ความชื้น และระดับควัน MQ-2

2. **ฐานข้อมูล PostgreSQL บน Supabase Cloud**:
   - ย้ายระบบฐานข้อมูลและประวัติการแตะบัตรจาก Google Sheets มาไว้บน Supabase Cloud PostgreSQL 100%
   - รองรับ Row Level Security (RLS) และ Supabase Realtime Subscription

3. **ระบบ Wi-Fi อัจฉริยะ (WiFiManager สำหรับทุกบอร์ด)**:
   - บอร์ดทุกตัวมี Captive Portal AP เฉพาะตัวเพื่อตั้งค่า Wi-Fi ผ่านมือถือ (`192.168.4.1`)
   - บันทึก Wi-Fi ลง Flash/NVS ถาวร
   - **ปุ่ม Reset Wi-Fi**: กดปุ่ม **BOOT (GPIO 0)** ค้าง 3 วินาที เพื่อล้างค่า Wi-Fi แล้วตั้งค่าใหม่

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` ไปเป็น `.env.local`:
```bash
cp .env.example .env.local
```

ตรวจสอบค่าใน `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://kqkggjsjwbkodqyeddwj.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc
SUPABASE_URL=https://kqkggjsjwbkodqyeddwj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc
DB_DRIVER=postgres
INGEST_TOKEN=act_smartcity_ingest_secret_token_2026
SETTINGS_TOKEN=act_smartcity_settings_secret_token_2026
CONTROL_TOKEN=act_operator_secret_token_2026
OPERATOR_NAME=ACT_Admin
OFFLINE_AFTER_SECONDS=120
```

### 3. เริ่มรัน Dev Server
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่: **`http://localhost:3000`**

---

## 🗄️ การตั้งค่า Supabase Database (PostgreSQL)

เปิดหน้า **[Supabase SQL Editor](https://supabase.com/dashboard/project/kqkggjsjwbkodqyeddwj/sql/new)** แล้วนำโค้ดจากไฟล์ [`supabase_schema.sql`](./supabase_schema.sql) ไปวางและกด **Run**

### โครงสร้างตารางในฐานข้อมูล:
| ตาราง | คำอธิบาย |
| :--- | :--- |
| `public.events` | ข้อมูลเซนเซอร์ Telemetry ทั้ง 5 ระบบ (รวมสัญญาณไฟ 4 ทิศทาง) |
| `public.rfid_cards` | ฐานข้อมูล UID บัตร RFID, ชื่อผู้ถือบัตร, บทบาท, สถานะ (`allow`/`banned`) |
| `public.gate_logs` | ประวัติการแตะบัตรผ่านประตูอัตโนมัติ (บันทึกเวลา, ชื่อ, บทบาท, ผลการอนุญาต) |
| `public.settings` | การตั้งค่าโหมด (`live`/`demo`) และการตั้งค่าระบบ |
| `public.command_audit` | บันทึกประวัติการส่งคำสั่งควบคุมอุปกรณ์จาก Dashboard |
| `public.todos` | ตารางทดสอบการเชื่อมต่อ Next.js SSR |

---

## ☁️ การ Deploy ขึ้น Vercel (แนะนำ)

1. เข้าไปที่ **[vercel.com](https://vercel.com)** และ Login ด้วย GitHub
2. กด **Add New...** -> **Project** -> เลือก Repository **`Bungkii/Smart-City`**
3. ในส่วน **Environment Variables** ให้ใส่ค่าจาก `.env.local`
4. กด **Deploy** เว็บไซต์จะพร้อมใช้งานทันทีภายใน 30 วินาที

---

## ☁️ การ Deploy ขึ้น Cloudflare Pages

1. เข้าไปที่ **[dash.cloudflare.com](https://dash.cloudflare.com)**
2. เมนู **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**
3. เลือก Repository **`Bungkii/Smart-City`**
4. ตั้งค่า:
   - **Framework preset**: `Next.js`
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
5. เพิ่ม **Environment Variables** ตามตารางใน `.env.local`
6. กด **Save and Deploy**

---

## 🔌 รายละเอียดบอร์ดฮาร์ดแวร์ทั้ง 5 ระบบ (Hardware Firmware)

| บอร์ด | ไฟล์โค้ด | เซนเซอร์ / อุปกรณ์ | Wi-Fi Captive Portal AP |
| :--- | :--- | :--- | :--- |
| **Board 1** | [`ESP32-1_RFID Gate Access.ino`](./Arduino/Board_1/ESP32-1_RFID%20Gate%20Access.ino) | RC522 RFID, LCD 16x2, Relay/LED, Buzzer | `ACT-RFID-Gate-Setup` |
| **Board 2** | [`UNOR4-2_Traffic Light.ino`](./Arduino/Board_2/UNOR4-2_Traffic%20Light.ino) | 2x Ultrasonic, 2x PIR, 12x LEDs (4 ทิศทาง) | `ACT-Traffic-Light-Setup` |
| **Board 3** | [`ESP32-3_Smart Parking.ino`](./Arduino/Board_3/ESP32-3_Smart%20Parking.ino) | 2x Ultrasonic (In/Out), OLED SSD1306 | `ACT-Smart-Parking-Setup` |
| **Board 4** | [`ESP32-4_Smart Environment Station.ino`](./Arduino/Board_4/ESP32-4_Smart%20Environment%20Station.ino) | DHT11, MQ-2 Gas, OLED SSD1306 | `ACT-Environment-Station-Setup` |
| **Board 5** | [`ESP32-5_Adaptive Street Light.ino`](./Arduino/Board_5/ESP32-5_Adaptive%20Street%20Light.ino) | LDR Sensor, PIR Motion, PWM LED Dimmer | `ACT-Street-Light-Setup` |

### 📶 การเชื่อมต่อ Wi-Fi และ Reset:
- **เชื่อมต่อครั้งแรก**: เปิดบอร์ด -> เชื่อมต่อ Wi-Fi ชื่อ AP ของบอร์ด -> หน้าต่างเด้งไปที่ `192.168.4.1` -> เลือกชื่อ Wi-Fi ใส่รหัสผ่าน แล้วกด Save
- **การล้าง Wi-Fi เพื่อเปลี่ยนเครือข่าย**: กดปุ่ม **BOOT (GPIO 0)** บนบอร์ดค้างไว้ **3 วินาที** บอร์ดจะทำการลบค่า Wi-Fi และเปิด Captive Portal ให้ตั้งค่าใหม่ทันที

---

## 📡 API Endpoints

- **`GET /api/dashboard`**: ดึงข้อมูล Realtime Telemetry, สถานะอุปกรณ์, และประวัติย้อนหลัง
- **`POST /api/ingest`**: รับข้อมูล Telemetry จากบอร์ดฮาร์ดแวร์ภายนอก (Header: `Authorization: Bearer <INGEST_TOKEN>`)
- **`GET /api/rfid?type=cards`**: ดึงรายชื่อบัตร RFID ทั้งหมดจาก Supabase
- **`GET /api/rfid?type=logs`**: ดึงประวัติการแตะบัตรผ่านประตู
- **`POST /api/rfid`**: เพิ่ม/แก้ไขข้อมูลบัตร หรือบันทึก Gate Log
- **`POST /api/control`**: ส่งคำสั่งควบคุมฮาร์ดแวร์ (เช่น เปิด/ปิด ประตู, เปลี่ยนโหมดไฟจราจร)
- **`PATCH /api/settings`**: สลับโหมดการทำงาน (`live` / `demo`)
- **`POST /api/settings/wifi`**: ซิงก์ค่า Wi-Fi ส่วนกลางของระบบ

---

## 🛠️ การตรวจสอบความถูกต้องของโค้ด

```bash
# ตรวจสอบ TypeScript Typecheck
npm run typecheck

# ทดสอบ Production Build
npm run build
```

---

*พัฒนาและดูแลโดย Assumption College Thonburi (ACT) Smart City Initiative* 🇹🇭
