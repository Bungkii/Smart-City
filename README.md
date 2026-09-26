# Assumption College Thonburi — Smart City Dashboard

แดชบอร์ดภาษาไทยสำหรับ 5 ระบบ: ที่จอดรถ, สัญญาณจราจร, ไฟถนน, ประตู RFID และสถานีสิ่งแวดล้อม สร้างด้วย Next.js, TypeScript, SQLite หรือ Cloudflare D1

## เริ่มใช้งาน

ต้องใช้ Node.js 22 ขึ้นไปสำหรับแพ็กเกจ Supabase รุ่นที่ติดตั้ง

```bash
npm install
cp .env.example .env.local
npm run dev
```

เปิด `http://localhost:3000` ค่าเริ่มต้นเป็น **Demo Mode** และข้อมูลทุกจุดติดป้ายว่าสาธิต ฐานข้อมูล SQLite จะถูกสร้างที่ `data/smartcity.db` อัตโนมัติ

## Supabase SSR

ติดตั้ง `@supabase/supabase-js` และ `@supabase/ssr` แล้ว กำหนด URL กับ publishable key ใน `.env.local` ตาม `.env.example` ใช้ `src/utils/supabase/client.ts` ใน Client Component และ `src/utils/supabase/server.ts` ใน Server Component/Route Handler โดยส่ง `await cookies()` เข้า `createClient` ไฟล์ `src/proxy.ts` เรียก `getClaims()` เพื่อรีเฟรช session และส่ง cookie ใหม่กลับเบราว์เซอร์บน Next.js 16

ตัวอย่าง `todos` ไม่ถูกแทนที่ในหน้าแรก เพราะโปรเจกต์ยังไม่มี schema ของตารางนั้น ส่วนข้อมูล Smart City ปัจจุบันยังเก็บใน SQLite หรือ D1 ตาม `DB_DRIVER`; การย้ายข้อมูลไป Supabase ต้องกำหนดตารางและนโยบาย RLS ก่อน

ตั้งค่า `INGEST_TOKEN`, `SETTINGS_TOKEN` และ `CONTROL_OPERATORS_JSON` ใน `.env.local` ก่อนใช้งานจริง แต่ละ token ควรยาว สุ่ม และไม่ซ้ำกัน `CONTROL_OPERATORS_JSON` ผูกชื่อผู้สั่งกับ token เพื่อบันทึก audit log เช่น `{"operator-a":"random-secret-a"}`

## ใช้ Cloudflare D1

สร้างฐานข้อมูล D1 ใน Cloudflare แล้วกำหนดค่าต่อไปนี้ใน `.env.local` หรือ secrets ของโฮสต์ Next.js:

```bash
DB_DRIVER=d1
CF_ACCOUNT_ID=...
CF_D1_DATABASE_ID=...
CF_API_TOKEN=...
```

API token ต้องมีสิทธิ์ D1 Read และ D1 Write โค้ดจะสร้างตาราง `settings`, `events`, `command_audit` และข้อมูล Demo Mode ใน D1 เมื่อเรียก API ครั้งแรก ห้ามนำค่าเหล่านี้ไปไว้ในตัวแปร `NEXT_PUBLIC_*` หรือส่งไปยังเบราว์เซอร์ การเชื่อมต่อปัจจุบันใช้ [D1 Query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/) ฝั่งเซิร์ฟเวอร์ จึงรัน Next.js บน Node host ได้โดยไม่ต้องติดตั้ง Cloudflare Workers ทั้งแอป สำหรับปริมาณงานสูง ควรย้ายชั้น `src/lib/d1.ts` ไปใช้ Worker ที่มี D1 binding เพราะ Cloudflare ระบุว่า REST API เหมาะกับงานบริหารและมีอัตราจำกัดของ Cloudflare API

## รับข้อมูลอุปกรณ์

`POST /api/ingest` ต้องส่ง `Authorization: Bearer <INGEST_TOKEN>` และ `Content-Type: application/json` ข้อมูลถูกตรวจด้วย Zod, ตรวจเวลาไม่ให้ห่างจากปัจจุบันเกิน 24 ชั่วโมง และเก็บประวัติทุกเหตุการณ์

ตัวอย่าง **schema กลางของแอป** สำหรับสถานีสิ่งแวดล้อม (ไม่ใช่ payload ของฮาร์ดแวร์):

```json
{
  "system": "environment",
  "deviceId": "EN-01",
  "name": "สถานีหน้าอาคาร",
  "location": "อาคาร A",
  "position": { "lat": 13.7563, "lng": 100.5018 },
  "recordedAt": "2026-09-25T10:00:00Z",
  "health": "normal",
  "data": { "pm25": 24.5, "temperature": 30.2, "humidity": 63 }
}
```

ดูชนิดข้อมูลครบทั้ง 5 ระบบใน `src/lib/model.ts` อุปกรณ์ HTTP ที่ส่ง schema นี้ได้โดยตรงเรียก API ได้ทันที ถ้า payload ต่างออกไป ให้เขียน adapter ตาม interface ใน `src/lib/adapter.ts` เพื่อ map เป็น schema กลางก่อนส่งเข้า API สำหรับ MQTT ให้ bridge subscribe topic แล้วใช้ `forwardMqttMessage` ส่งข้อมูลหลัง map เข้ามา ระบบไม่กำหนด topic, QoS หรือรูปแบบ payload ของฮาร์ดแวร์เอง

`position` ไม่บังคับ หากมีพิกัดจริง แผนที่ OpenStreetMap จะแสดงหมุดอุปกรณ์และสถานะ หากไม่มีพิกัด แผนที่จะบอกว่ายังไม่มีพิกัด ไม่สร้างตำแหน่งจริงขึ้นเอง ใน Demo Mode พิกัดตัวอย่างจะมีป้ายกำกับชัดเจน

## สลับโหมดและควบคุมอุปกรณ์

- `PATCH /api/settings` รับ `{ "mode": "live" }` หรือ `demo` และ Bearer `SETTINGS_TOKEN` หน้า `/settings` มีฟอร์มให้สลับโหมด
- Live Mode แสดงเฉพาะข้อมูลที่ `POST /api/ingest` ส่งเข้ามา ไม่มีอุปกรณ์แล้วแสดงว่าง ไม่ใช้ข้อมูลจำลองปน
- หน้าเว็บดึงข้อมูลใหม่ทุก 5 วินาที และทำเครื่องหมาย **ออฟไลน์** เมื่อไม่มีข้อมูลใหม่เกิน `OFFLINE_AFTER_SECONDS` (ค่าเริ่มต้น 120 วินาที)
- `POST /api/control` ต้องมี Bearer token ที่ผูกผู้สั่ง, อุปกรณ์จริงที่รู้จักและยังออนไลน์, คำสั่งที่ผ่าน schema และเหตุผลอย่างน้อย 3 ตัวอักษร หน้าเว็บให้ผู้ใช้ยืนยันก่อนส่ง
- ต้องกำหนด `DEVICE_COMMAND_URL` และ `DEVICE_COMMAND_TOKEN` ให้ชี้ไปยัง **adapter ของคุณเอง** ซึ่งรับคำสั่งรูปแบบกลาง `{system, deviceId, command, reason, actor, requestedAt}` แล้วแปลงเป็น protocol จริง ก่อนมี adapter ระบบจะตอบ 503 และไม่ส่งคำสั่งไปยังฮาร์ดแวร์ คำสั่งที่ส่งหรือปฏิเสธจาก adapter ถูกบันทึกใน `command_audit`

## ข้อมูลที่ต้องขอเพื่อเชื่อมฮาร์ดแวร์จริง

1. รายการอุปกรณ์จริง รหัสอุปกรณ์ ตำแหน่ง และเจ้าของระบบ
2. ช่องทางเชื่อมต่อของแต่ละรุ่น: HTTP endpoint หรือ MQTT broker, topic, QoS, TLS และวิธียืนยันตัวตน
3. ตัวอย่าง payload จริงพร้อมหน่วย, timezone, ความหมายของสถานะ/รหัสผิดพลาด และรอบการส่งข้อมูล
4. ข้อกำหนดคำสั่งควบคุมจริง: endpoint/topic, payload, การตอบรับ, timeout, การยืนยันผล และข้อห้ามด้านความปลอดภัย
5. บัญชี Cloudflare, D1 database ID และ API token ถ้าจะใช้ D1

## ตรวจสอบ

```bash
npm run typecheck
npm run build
```

เส้นทางหลัก: `/`, `/systems/parking`, `/systems/traffic`, `/systems/streetlight`, `/systems/gate`, `/systems/environment`, `/settings`, `/api/dashboard`, `/api/ingest`, `/api/control`, `/api/settings`
