# 🔌 WIRE.md — Smart City 6-Board Hardware Wiring & Pinout Guide

เอกสารคู่มือการต่อสายไฟของระบบเมืองอัจฉริยะ (Assumption College Thonburi) สำหรับฮาร์ดแวร์จริงทั้ง 6 บอร์ด กำหนดขา Pin, โปรโตคอลการสื่อสาร (SPI, I2C, ADC, PWM) และระบบแรงดันไฟตรงตามโค้ดเฟิร์มแวร์จริง 100%

---

## ⚡ 1. Critical Power & Ground Rules (กฎความปลอดภัยของระบบไฟ)

1. **Common Ground (GND ร่วม):** สาย **GND ของทุกบอร์ด, เซ็นเซอร์ และแหล่งจ่ายไฟภายนอก 5V/3.3V** ต้องเชื่อมต่อถึงกันทั้งหมดบน Ground Rail เพื่อให้อ้างอิงระดับแรงดันเดียวกัน
2. **แรงดันไฟ 3.3V สำหรับ RFID RC522:** โมดูล RC522 ต้องรับไฟจากพิน **3.3V ของ ESP32 เท่านั้น** (ห้ามต่อ 5V เด็ดขาด ชิปจะเสียหายทันที)
3. **การจ่ายไฟให้อุปกรณ์กระแสสูง:** มอเตอร์เซอร์โว SG90, Active Buzzer และหลอดไฟ LED วัตต์สูง ต้องดึงไฟเลี้ยงจาก **Power Supply 5V ภายนอก** ห้ามดึงตรงจากขา 5V/3.3V ของบอร์ดไมโครคอนโทรลเลอร์ เพื่อป้องกันบอร์ดไฟตกและรีเซ็ตตัวเอง
4. **คำแนะนำชิปไมโครคอนโทรลเลอร์:**
   - **Board 1, 3, 4, 6:** ใช้ **ESP32** (รองรับ Hardware SPI, I2C, Hardware Timers และการเชื่อมต่อ Supabase HTTPS/TLS)
   - **Board 2, 5:** ใช้ **Arduino UNO R4 WiFi** หรือ **ESP32** (ไม่แนะนำ ESP8266 เนื่องจากขา GPIO ไม่เพียงพอ และ RAM จำกัดเมื่อเชื่อมต่อ HTTPS/TLS)

---

## 📍 Board 1: RFID Entry Gate (ESP32 — GT-1)
> ด่านทางเข้าหลัก: ตรวจสอบสิทธิ์บัตรผ่าน Supabase REST API, แสดงผล LCD 16x2 I2C, สัญญาณ Buzzer และสั่งเปิดไม้กั้น

### 1. RFID RC522 (ฮาร์ดแวร์ SPI)
* **3.3V** -> Pin **3.3V** บน ESP32 *(ห้ามต่อ 5V เด็ดขาด)*
* **GND** -> Common GND Rail
* **RST** -> Pin **GPIO 4**
* **SDA (SS)** -> Pin **GPIO 5**
* **SCK** -> Pin **GPIO 18**
* **MISO** -> Pin **GPIO 19**
* **MOSI** -> Pin **GPIO 21**

### 2. จอแสดงผล LCD 16x2 I2C
* **VCC** -> External 5V Rail
* **GND** -> Common GND Rail
* **SDA** -> Pin **GPIO 23**
* **SCL** -> Pin **GPIO 22**

### 3. สัญญาณเตือนและเปิดไม้กั้นขาเข้า
* **Active Buzzer (+):** Pin **GPIO 25** (ผ่านตัวต้านทาน หรือขับผ่านทรานซิสเตอร์)
* **สัญญาณเปิดไม้กั้นขาเข้า (LED / Relay / Servo Signal):** Pin **GPIO 14**
* **ปุ่มกด Reset Wi-Fi (BOOT Button):** Pin **GPIO 0** (กดค้าง 3 วินาทีเพื่อเปิด Web Portal ตั้งค่า Wi-Fi)

---

## 📍 Board 2: 4-Way Traffic Light Controller (Arduino UNO R4 WiFi / ESP32 — TR-1)
> ควบคุมไฟจราจรสี่แยก 4 ทิศทาง (เหนือ, ตะวันออก, ใต้, ตะวันตก) พร้อม Ultrasonic และ PIR ตรวจจับรถเพื่อขยายเวลาไฟเขียวอัตโนมัติ

*(หมายเหตุ: หลอดไฟ LED ทุกดวงต้องต่ออนุกรมกับตัวต้านทาน 220Ω ก่อนต่อลง Pin)*

### 1. ไฟสัญญาณจราจร 4 ทิศทาง (LED ผ่าน R 220Ω)
* **ฝั่งเหนือ (North):**
  * LED สีแดง -> Pin **D4**
  * LED สีเหลือง -> Pin **D5**
  * LED สีเขียว -> Pin **D6**
  * ขั้วลบ (Cathode) -> Common GND Rail
* **ฝั่งตะวันออก (East):**
  * LED สีแดง -> Pin **D7**
  * LED สีเหลือง -> Pin **D8**
  * LED สีเขียว -> Pin **D9**
  * ขั้วลบ (Cathode) -> Common GND Rail
* **ฝั่งใต้ (South):**
  * LED สีแดง -> Pin **D10**
  * LED สีเหลือง -> Pin **D11**
  * LED สีเขียว -> Pin **D12**
  * ขั้วลบ (Cathode) -> Common GND Rail
* **ฝั่งตะวันตก (West):**
  * LED สีแดง -> Pin **A0**
  * LED สีเหลือง -> Pin **A1**
  * LED สีเขียว -> Pin **A2**
  * ขั้วลบ (Cathode) -> Common GND Rail

### 2. เซ็นเซอร์ตรวจจับรถ (Adaptive Traffic Sensors)
* **Ultrasonic เซ็นเซอร์วัดระยะทาง (HC-SR04):**
  * **VCC:** External 5V Rail
  * **GND:** Common GND Rail
  * **Trig (ส่งคลื่น):** Pin **D2** (ขา TRIG ร่วม)
  * **Echo เหนือ (North):** Pin **D3**
  * **Echo ใต้ (South):** Pin **A4**
* **PIR Motion Sensor (ตรวจจับความเคลื่อนไหว):**
  * **VCC:** External 5V Rail
  * **GND:** Common GND Rail
  * **PIR ตะวันออก (East):** Pin **A3**
  * **PIR ตะวันตก (West):** Pin **D13**

---

## 📍 Board 3: Smart Parking System (ESP32 — PK-1)
> ตรวจจับรถเข้า-ออกลานจอดด้วย Ultrasonic 2 จุด, คำนวณช่องว่างรวม 8 ช่อง, แสดงผลเวลา NTP กองทัพเรือและจำนวนที่ว่างบนจอ OLED

### 1. Ultrasonic ตรวจจับรถขาเข้า (Entrance Sensor)
* **VCC:** External 5V Rail
* **GND:** Common GND Rail
* **Trig:** Pin **GPIO 5**
* **Echo:** Pin **GPIO 18** (แนะนำผ่านตัวแบ่งแรงดัน 5V -> 3.3V หรือรับเข้าขา tolerant)

### 2. Ultrasonic ตรวจจับรถขาออก (Exit Sensor)
* **VCC:** External 5V Rail
* **GND:** Common GND Rail
* **Trig:** Pin **GPIO 19**
* **Echo:** Pin **GPIO 23**

### 3. จอแสดงผล OLED 0.96" I2C (SSD1306 128x64)
* **VCC:** 3.3V หรือ 5V
* **GND:** Common GND Rail
* **SDA:** Pin **GPIO 21**
* **SCL:** Pin **GPIO 22**

---

## 📍 Board 4: Smart Environment Station (ESP32 — EN-1)
> สถานีตรวจวัดสภาพอากาศ: วัดอุณหภูมิและความชื้นด้วย DHT11, ตรวจจับควัน/ก๊าซด้วย MQ-2, แสดงผลบน OLED และซิงก์ขึ้น Cloud

### 1. DHT11 / DHT22 (เซ็นเซอร์วัดอุณหภูมิและความชื้น)
* **VCC (+) / Pin 1:** ต่อไฟเลี้ยง **3.3V** หรือ **5V**
* **DATA / Pin 2:** ต่อเข้า **GPIO 4** บน ESP32 (ต่อ R Pull-up 4.7kΩ - 10kΩ เข้า VCC หากใช้โมดูลเปลือย)
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

### 4. ปุ่ม Reset Wi-Fi
* **BOOT Button:** Pin **GPIO 0** (กดค้างตอนบูตเพื่อเปิด AP Portal สำหรับตั้งค่าเครือข่าย)

---

## 📍 Board 5: Adaptive Street Light (ESP32 หรือ UNO R4 WiFi — SL-1)
> เสาไฟถนนอัจฉริยะ: วัดระดับแสงรอบข้างด้วย LDR, ตรวจจับคน/รถด้วย PIR และปรับความสว่างไฟถนนแบบ Smooth PWM (กลางวันปิด / กลางคืนหรี่ 15% / มีคนผ่านสว่าง 100%)

### 1. วงจรแบ่งแรงดัน LDR (Light Dependent Resistor)
* ขาที่ 1 ของ LDR -> External 5V Rail
* ขาที่ 2 ของ LDR -> ต่อตัวต้านทาน 10kΩ ลง Common GND Rail และต่อขาสัญญาณเข้า:
  * **ESP32:** Pin **GPIO 34** (ADC1)
  * **UNO R4 WiFi:** Pin **A0**

### 2. PIR Motion Sensor (ตรวจจับคน/รถ)
* **VCC:** External 5V Rail
* **GND:** Common GND Rail
* **ขาสัญญาณ OUT:**
  * **ESP32:** Pin **GPIO 27**
  * **UNO R4 WiFi:** Pin **D2**

### 3. ชุดขับหลอดไฟถนน (Transistor NPN 2N2222 ขับ LED PWM)
* **ขาสัญญาณ PWM สั่งหรี่/สว่าง:**
  * **ESP32:** Pin **GPIO 18** -> ผ่านตัวต้านทาน 1kΩ -> ขา **Base (B)** ของ 2N2222
  * **UNO R4 WiFi:** Pin **D3** (PWM) -> ผ่านตัวต้านทาน 1kΩ -> ขา **Base (B)** ของ 2N2222
* **Emitter (E):** Common GND Rail
* **Collector (C):** ขั้วลบ (Cathode) ของหลอด LED ขาว (ต่อขนานกัน)
* **ขั้วบวก (Anode) ของหลอด LED แต่ละดวง:** ผ่านตัวต้านทาน 220Ω -> External 5V Rail

---

## 📍 Board 6: RFID Exit Gate (ESP32 — GT-2)
> ด่านทางออก: ตรวจสอบสิทธิ์บัตรขาออกผ่าน Supabase REST API, บันทึกประวัติสแกนทิศทาง OUT, แสดงผล LCD 16x2 I2C และสั่งเปิดไม้กั้นขาออก

### 1. RFID RC522 (ฮาร์ดแวร์ SPI)
* **3.3V** -> Pin **3.3V** บน ESP32 *(ห้ามต่อ 5V เด็ดขาด)*
* **GND** -> Common GND Rail
* **RST** -> Pin **GPIO 4**
* **SDA (SS)** -> Pin **GPIO 5**
* **SCK** -> Pin **GPIO 18**
* **MISO** -> Pin **GPIO 19**
* **MOSI** -> Pin **GPIO 21**

### 2. จอแสดงผล LCD 16x2 I2C
* **VCC** -> External 5V Rail
* **GND** -> Common GND Rail
* **SDA** -> Pin **GPIO 23**
* **SCL** -> Pin **GPIO 22**

### 3. สัญญาณเตือนและเปิดไม้กั้นขาออก
* **Active Buzzer (+):** Pin **GPIO 25**
* **สัญญาณเปิดไม้กั้นขาออก (LED / Relay):** Pin **GPIO 14**
* **ปุ่มกด Reset Wi-Fi (BOOT Button):** Pin **GPIO 0** (กดค้าง 3 วินาทีเพื่อเปิด Web Portal ตั้งค่า Wi-Fi)

---

## 📊 ตารางสรุป Pinout เปรียบเทียบทั้ง 6 บอร์ด

| บอร์ด | อุปกรณ์ | โปรโตคอล / การต่อสาย | ขา Pin ที่ใช้ (ESP32 / UNO R4) | ไฟเลี้ยงที่ต้องใช้ |
|---|---|---|---|---|
| **Board 1 (GT-1)** | RFID RC522 | Hardware SPI | SS: 5, RST: 4, SCK: 18, MISO: 19, MOSI: 21 | **3.3V เท่านั้น** |
| | LCD 16x2 | I2C | SDA: 23, SCL: 22 | 5V |
| | Buzzer / Gate LED | Digital Output | Gate: 14, Buzzer: 25, Boot/Reset: 0 | 5V / 3.3V |
| **Board 2 (TR-1)** | ไฟจราจร 4 แยก | Digital Out (R 220Ω) | N: 4,5,6 \| E: 7,8,9 \| S: 10,11,12 \| W: A0,A1,A2 | 5V / บอร์ด |
| | HC-SR04 | Ultrasonic | Trig: D2, Echo N: D3, Echo S: A4 | 5V |
| | PIR Motion | Digital In | PIR E: A3, PIR W: D13 | 5V |
| **Board 3 (PK-1)** | HC-SR04 (ทางเข้า) | Ultrasonic | Trig: 5, Echo: 18 | 5V |
| | HC-SR04 (ทางออก) | Ultrasonic | Trig: 19, Echo: 23 | 5V |
| | OLED 0.96" SSD1306 | I2C | SDA: 21, SCL: 22 | 3.3V / 5V |
| **Board 4 (EN-1)** | DHT11 / DHT22 | 1-Wire Digital | DATA: GPIO 4 | 3.3V / 5V |
| | MQ-2 Gas/Smoke | Analog In (ADC1) | AOUT: GPIO 34 | 5V (Heater) |
| | OLED 0.96" SSD1306 | I2C | SDA: 21, SCL: 22 | 3.3V / 5V |
| **Board 5 (SL-1)** | LDR แสงสว่าง | Analog In (ADC1) | ESP32: GPIO 34 \| UNO R4: A0 | 5V (R 10kΩ) |
| | PIR Motion | Digital In | ESP32: GPIO 27 \| UNO R4: D2 | 5V |
| | หลอดไฟถนน LED | PWM Drive | ESP32: GPIO 18 \| UNO R4: D3 | 5V External |
| **Board 6 (GT-2)** | RFID RC522 | Hardware SPI | SS: 5, RST: 4, SCK: 18, MISO: 19, MOSI: 21 | **3.3V เท่านั้น** |
| | LCD 16x2 | I2C | SDA: 23, SCL: 22 | 5V |
| | Buzzer / Gate LED | Digital Output | Gate: 14, Buzzer: 25, Boot/Reset: 0 | 5V / 3.3V |
