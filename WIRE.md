# 🔌 WIRE.md — Arduino UNO Smart City Wiring Guide

เอกสารคู่มือการต่อสายอุปกรณ์ทั้งหมดเข้ากับบอร์ด **Arduino UNO R3** ตามผังวงจร Smart City พร้อมระบบจ่ายไฟรวม (Power Distribution)

---

## ⚡ 1. Power Distribution & Safety Rules (ข้อพึงระวัง)

1. **Common Ground (GND ร่วม):** สาย GND ของแหล่งจ่ายไฟภายนอก 5V, Arduino GND, เซนเซอร์ทุกตัว และ Servo ต้องเชื่อมเข้าสู่ Ground Rail เดียวกันทั้งหมด
2. **แรงดันไฟ 3.3V ห้ามสับสน:**
   * ขา **3.3V ของ Arduino UNO** ต่อเข้าขา **VCC ของโมดูล RFID RC522 เท่านั้น** (ห้ามต่อ 5V เด็ดขาด ชิปจะไหม้)
3. **การจ่ายไฟให้อุปกรณ์กำลังขับสูง (Servo & LEDs):**
   * บอร์ด Arduino UNO ไม่สามารถจ่ายกระแสเพียงพอให้ Servo SG90 และหลอดไฟถนนพร้อมกันได้
   * ให้ใช้ **Power Supply Module 5V ภายนอก** จ่ายไฟเข้าราง 5V (+) และ GND (-) ของ Breadboard โดยตรง

---

## 📌 2. Pinout & Wiring Connections

### 💳 1. RFID RC522 (SPI Bus)
* **VCC** -> 3.3V บน Arduino UNO *(ห้ามต่อ 5V)*
* **RST** -> Pin **D9**
* **GND** -> GND Rail
* **MISO** -> Pin **D12**
* **MOSI** -> Pin **D11**
* **SCK** -> Pin **D13**
* **SDA (SS)** -> Pin **D10**

### 🚗 2. Ultrasonic Sensor (HC-SR04 - Smart Parking)
* **VCC** -> 5V Rail
* **GND** -> GND Rail
* **Trig** -> Pin **D7**
* **Echo** -> Pin **D8**

### 🚧 3. Servo SG90 (Barrier Gate)
* **VCC (สายสีแดง)** -> 5V Rail (แหล่งจ่ายไฟภายนอก)
* **GND (สายสีน้ำตาล/ดำ)** -> GND Rail
* **Signal (สายสีส้ม)** -> Pin **D6**

### 📟 4. จอ LCD 16x2 I2C
* **GND** -> GND Rail
* **VCC** -> 5V Rail
* **SDA** -> Pin **A4**
* **SCL** -> Pin **A5**

### 💡 5. ระบบไฟถนน (LDR + Transistor 2N2222)
* **LDR Divider:**
  * ขาหนึ่งของ LDR ต่อ 5V Rail
  * อีกขาของ LDR ต่อเข้า Pin **A0** และต่อตัวต้านทาน 10kΩ ลง GND Rail
* **วงจรขับ LED ไฟถนน (2N2222):**
  * Pin **A1** -> ต่อผ่าน R 1kΩ -> ขา Base (B) ของ Transistor 2N2222
  * ขา Emitter (E) ของ Transistor -> GND Rail
  * ขา Collector (C) ของ Transistor -> ขั้วลบ (Cathode) ของ LED สีขาว 3-6 ดวง
  * ขั้วบวก (Anode) ของ LED -> ต่อผ่าน R 220Ω -> 5V Rail

### 🚦 6. ระบบไฟจราจร 2 ทิศทาง (LEDs ผ่านตัวต้านทาน 220Ω ทุกดวง)
* **ฝั่ง North-South (N-S):**
  * LED สีแดง -> Pin **D2**
  * LED สีเหลือง -> Pin **D3**
  * LED สีเขียว -> Pin **D4**
* **ฝั่ง East-West (E-W):**
  * LED สีแดง -> Pin **A2**
  * LED สีเหลือง -> Pin **A3**
  * LED สีเขียว -> Pin **D5**
  * *(ขั้วลบของหลอด LED ทุกตัวต่อลง GND Rail)*
