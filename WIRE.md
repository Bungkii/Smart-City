# 🔌 WIRE.md — 3-Board Arduino UNO Smart City Wiring Guide

เอกสารคู่มือการต่อสายไฟของระบบเมืองอัจฉริยะแบบแยก 3 บอร์ดอิสระ (3 Arduino UNO R3) กำหนดพินและระบบไฟตรงตามโค้ดอย่างสมบูรณ์

---

## ⚡ 1. Critical Power & Ground Rules (กฎความปลอดภัยของระบบไฟ)

1. **Common Ground (GND ร่วม):** สาย **GND ของบอร์ดที่ 1, บอร์ดที่ 2, บอร์ดที่ 3 และแหล่งจ่ายไฟภายนอก 5V** ต้องเชื่อมต่อถึงกันทั้งหมดบน Ground Rail เพื่อให้อ้างอิงระดับแรงดันเดียวกัน
2. **แรงดันไฟ 3.3V สำหรับ RFID:** โมดูล RC522 ต้องรับไฟจากพิน **3.3V ของบอร์ดที่ 1 เท่านั้น** (ห้ามต่อ 5V เด็ดขาด ชิปจะเสียหายทันที)
3. **การจ่ายไฟให้อุปกรณ์กระแสสูง:** เซอร์โว SG90 และชุดไฟถนน LED ต้องดึงไฟเลี้ยงจาก **Power Supply 5V ภายนอก** ห้ามดึงตรงจากขา 5V ของบอร์ด Arduino เพื่อป้องกันบอร์ดรีเซ็ตตัวเอง

---

## 📍 Board 1: Gate & Display Controller (ด่านทางเข้าและจอแสดงผล)

### 1. RFID RC522 (ฮาร์ดแวร์ SPI)
* **3.3V**  -> Pin **3.3V** (บน Arduino Board 1 เท่านั้น)
* **RST**   -> Pin **D9**
* **GND**   -> Common GND Rail
* **MISO**  -> Pin **D12**
* **MOSI**  -> Pin **D11**
* **SCK**   -> Pin **D13**
* **SDA (SS)** -> Pin **D10**

### 2. Servo SG90 (ไม้กั้นทางเข้า)
* **Signal (สายสีส้ม)**  -> Pin **D6**
* **VCC (สายสีแดง)**     -> External 5V Rail
* **GND (สายสีน้ำตาล)** -> Common GND Rail

### 3. จอ LCD 16x2 I2C
* **VCC** -> External 5V Rail
* **GND** -> Common GND Rail
* **SDA** -> Pin **A4**
* **SCL** -> Pin **A5**

---

## 📍 Board 2: Intersection Traffic Controller (ไฟจราจรสี่แยก)

หลอดไฟ LED ทุกหลอดต้องต่ออนุกรมกับตัวต้านทาน 220Ω ก่อนต่อลงบอร์ด เพื่อจำกัดกระแส

### 1. ฝั่ง North-South (N-S)
* **LED สีแดง**    -> Pin **D2** (ผ่าน R 220Ω)
* **LED สีเหลือง** -> Pin **D3** (ผ่าน R 220Ω)
* **LED สีเขียว**  -> Pin **D4** (ผ่าน R 220Ω)
* **ขั้วลบ (Cathode)** -> Common GND Rail

### 2. ฝั่ง East-West (E-W)
* **LED สีแดง**    -> Pin **D5** (ผ่าน R 220Ω)
* **LED สีเหลือง** -> Pin **D6** (ผ่าน R 220Ω)
* **LED สีเขียว**  -> Pin **D7** (ผ่าน R 220Ω)
* **ขั้วลบ (Cathode)** -> Common GND Rail

---

## 📍 Board 3: Parking & Street Light Controller (ที่จอดรถและไฟถนน)

### 1. Ultrasonic Sensor (HC-SR04 - ตรวจจับช่องจอด)
* **VCC**  -> External 5V Rail
* **GND**  -> Common GND Rail
* **Trig** -> Pin **D7**
* **Echo** -> Pin **D8**

### 2. วงจรแบ่งแรงดัน LDR (Light Dependent Resistor)
* ขาที่ 1 ของ LDR -> External 5V Rail
* ขาที่ 2 ของ LDR -> Pin **A0** และต่อตัวต้านทาน 10kΩ ลง Common GND Rail

### 3. วงจรขับหลอดไฟถนน (Transistor NPN 2N2222)
* Pin **D2** -> ผ่านตัวต้านทาน 1kΩ -> ขา **Base (B)** ของ Transistor 2N2222
* ขา **Emitter (E)** ของ 2N2222 -> Common GND Rail
* ขา **Collector (C)** ของ 2N2222 -> ขั้วลบ (Cathode) ของหลอด LED ขาว (3-6 ดวง ขนานกัน)
* ขั้วบวก (Anode) ของ LED ขาวแต่ละดวง -> ผ่านตัวต้านทาน 220Ω -> External 5V Rail
