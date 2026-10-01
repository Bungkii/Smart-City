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

---

## 📍 Board 4: Smart Environment Station (ESP32 — EN-1)

สถานีตรวจวัดคุณภาพอากาศและสภาพแวดล้อม (ส่งค่าอุณหภูมิและความชื้นจาก DHT11 และเตือนควันจาก MQ-2 ไปยัง Dashboard และ Supabase)

### 1. DHT11 / DHT22 (เซ็นเซอร์วัดอุณหภูมิและความชื้น)
* **VCC (+) / Pin 1:** ต่อไฟเลี้ยง **3.3V** หรือ **5V**
* **DATA / Pin 2:** ต่อเข้า **GPIO 4** บน ESP32 (มี R Pull-up 4.7kΩ - 10kΩ เข้า VCC หากใช้โมดูลเปลือย)
* **GND (-) / Pin 4:** ต่อเข้า **Common GND Rail**

### 2. MQ-2 Gas / Smoke Sensor (ตรวจจับควันและก๊าซรั่ว)
* **VCC:** ต่อไฟเลี้ยง **External 5V Rail** (ฮีตเตอร์ของ MQ-2 ต้องการไฟ 5V)
* **GND:** ต่อเข้า **Common GND Rail**
* **AOUT (Analog Out):** ต่อเข้า **GPIO 34** บน ESP32 (ADC1)

### 3. จอแสดงผล OLED 0.96" I2C (SSD1306 128x64)
* **VCC:** ต่อไฟเลี้ยง **3.3V** หรือ **5V**
* **GND:** ต่อเข้า **Common GND Rail**
* **SDA:** ต่อเข้า **GPIO 21** บน ESP32
* **SCL:** ต่อเข้า **GPIO 22** บน ESP32

---

## 📍 Board 5: Adaptive Street Light (ESP32 หรือ UNO R4 WiFi)

แนะนำให้ใช้ **ESP32** สำหรับประมวลผลและการเชื่อมต่อ TLS ไปยัง Supabase ที่เสถียร (ไม่แนะนำ ESP8266)

### 1. วงจรแบ่งแรงดัน LDR (Light Dependent Resistor)
* **ESP32:** ขาสัญญาณ LDR -> **GPIO 34** (ADC1)
* **UNO R4:** ขาสัญญาณ LDR -> **A0**

### 2. PIR Motion Sensor
* **ESP32:** ขาสัญญาณ OUT -> **GPIO 27**
* **UNO R4:** ขาสัญญาณ OUT -> **D2**

### 3. LED ขับไฟถนน (PWM หรี่/สว่าง)
* **ESP32:** สัญญาณ PWM -> **GPIO 18** (ผ่านวงจรขับ LED / Transistor)
* **UNO R4:** สัญญาณ PWM -> **D3** (PWM)

---

## 📍 Board 6: RFID Exit Gate ขาออก (ESP32 — GT-2)

แนะนำให้ใช้ **ESP32** (ไม่แนะนำ ESP8266 เนื่องจากมีพิน SPI และ I2C พร้อมกันไม่พอ)

### 1. RFID RC522 (ฮาร์ดแวร์ SPI)
* **3.3V**  -> Pin **3.3V** บน ESP32 *(ห้ามต่อ 5V เด็ดขาด)*
* **GND**   -> Common GND Rail
* **RST**   -> Pin **GPIO 4**
* **SDA (SS)** -> Pin **GPIO 5**
* **SCK**   -> Pin **GPIO 18**
* **MISO**  -> Pin **GPIO 19**
* **MOSI**  -> Pin **GPIO 21**

### 2. จอแสดงผล LCD 16x2 I2C
* **VCC** -> External 5V Rail
* **GND** -> Common GND Rail
* **SDA** -> Pin **GPIO 23**
* **SCL** -> Pin **GPIO 22**

### 3. สัญญาณเตือนและเปิดไม้กั้นขาออก
* **Active Buzzer (+)** -> Pin **GPIO 25**
* **สัญญาณเปิดไม้กั้นขาออก (LED / Relay)** -> Pin **GPIO 14**

