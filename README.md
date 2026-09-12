# 🏙️ Arduino UNO Distributed Smart City Model (3 Boards System)

แบบจำลองเมืองอัจฉริยะ (Smart City) ควบคุมการทำงานด้วยบอร์ดไมโครคอนโทรลเลอร์ **Arduino UNO R3 จำนวน 3 บอร์ด** แยกการทำงานอิสระตามโซนพื้นที่ (Distributed Architecture) เพื่อแก้ปัญหาความหนาแน่นของการเดินสายไฟ และตัดปัญหาสายสัญญาณรบกวนในโมเดลขนาดใหญ่

---

## 📌 Features (ระบบการทำงานหลักแยกตามบอร์ด)

1. 💳 **Smart Gateway & Central Display (Board 1):** สแกนบัตรหรือเหรียญ RFID (RC522) เพื่อตรวจสอบสิทธิ์ สั่งงาน Servo Motor (SG90) ยกไม้กั้นขึ้น 90 องศา ค้างไว้ 3 วินาทีแล้วปิดลงอัตโนมัติ พร้อมแสดงสถานะด่านทางเข้าผ่านจอ LCD 16x2 I2C
2. 🚦 **Smart Traffic Light (Board 2):** ควบคุมสัญญาณไฟจราจร 2 ทิศทาง (North-South และ East-West) สลับไฟเขียว-เหลือง-แดง 4 จังหวะต่อเนื่องแบบอิสระ ไม่กระตุกหรือดีเลย์จากการอ่านเซนเซอร์
3. 🅿️ **Smart Parking (Board 3):** วัดระยะตรวจจับรถเข้าจอดในช่องด้วย Ultrasonic Sensor (HC-SR04) ตรวจสอบสถานะช่องจอดว่าง/ไม่ว่างแบบ Real-time
4. 💡 **Smart Street Light (Board 3):** ตรวจวัดระดับความสว่างด้วยเซนเซอร์ LDR และสั่งเปิด-ปิดไฟถนน (LED สีขาว) อัตโนมัติผ่านวงจรขับทรานซิสเตอร์ NPN 2N2222 เมื่อถึงเวลากลางคืน

---

## 🛠️ Hardware Requirements (อุปกรณ์ที่ใช้)

* **Main Controllers:** บอร์ด Arduino UNO R3 x 3
* **Gate & Display (Zone 1):**
  * โมดูล RFID RC522 (13.56 MHz) + บัตร/พวงกุญแจ x 1
  * เซอร์โวมอเตอร์ Servo SG90 x 1
  * จอแสดงผล LCD 16x2 พร้อม I2C Interface Module x 1
* **Traffic Control (Zone 2):**
  * หลอด LED ไฟจราจร 5mm (แดง 2, เหลือง 2, เขียว 2) x 6
  * ตัวต้านทาน 220Ω (จำกัดกระแส LED จราจร) x 6
* **Parking & Street Light (Zone 3):**
  * เซนเซอร์ Ultrasonic HC-SR04 x 1
  * เซนเซอร์แสง LDR (Light Dependent Resistor) 2 ขา x 1
  * ทรานซิสเตอร์ NPN 2N2222 x 1
  * หลอด LED สีขาว (ไฟถนน 3–6 หลอด)
  * ตัวต้านทาน 1kΩ (ขา Base ทรานซิสเตอร์) x 1
  * ตัวต้านทาน 10kΩ (วงจรแบ่งแรงดัน LDR) x 1
  * ตัวต้านทาน 220Ω (จำกัดกระแส LED ไฟถนน)
* **Power & Wiring:**
  * Power Supply Module 5V สำหรับจ่ายไฟภายนอก x 1
  * Breadboard 830 รู และ สายจัมเปอร์ (Jumper Wires)

---

## 🔌 Pin Assignment Table (ผังการต่อขาบน Arduino UNO ทั้ง 3 บอร์ด)

### 📍 Board 1: Gate & Display Controller
| อุปกรณ์ | ขาของอุปกรณ์ | ขาต่อบน Arduino UNO | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **RFID RC522** | SDA (SS) / RST | **Pin D10 / Pin D9** | Digital I/O |
| **RFID RC522** | MOSI / MISO / SCK | **Pin D11 / Pin D12 / Pin D13** | Hardware SPI Bus |
| **RFID RC522** | 3.3V / GND | **3.3V / GND** | Power (ห้ามต่อ 5V) |
| **Servo SG90** | Signal (สายสีส้ม) | **Pin D6** | PWM Output |
| **LCD 16x2 I2C** | SDA / SCL | **Pin A4 / Pin A5** | I2C Bus |

### 📍 Board 2: Intersection Traffic Controller
| อุปกรณ์ | หลอดไฟ LED | ขาต่อบน Arduino UNO | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **Traffic N-S** | แดง / เหลือง / เขียว | **Pin D2 / Pin D3 / Pin D4** | Digital Output |
| **Traffic E-W** | แดง / เหลือง / เขียว | **Pin D5 / Pin D6 / Pin D7** | Digital Output |

### 📍 Board 3: Parking & Street Light Controller
| อุปกรณ์ | ขาของอุปกรณ์ | ขาต่อบน Arduino UNO | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **Ultrasonic HC-SR04** | Trig / Echo | **Pin D7 / Pin D8** | Digital Out / In |
| **LDR Sensor** | จุดต่อกึ่งกลาง (Voltage Divider) | **Pin A0** | Analog Input (ADC) |
| **ชุดไฟถนน 2N2222** | ขา Base (ผ่าน R 1kΩ) | **Pin D2** | Digital Output |
| **Common Power** | แหล่งจ่าย 5V / GND ร่วม | **5V Rail / Common GND** | Power Rail |

---

## 🗺️ System Architecture

```text
               +---------------------------------------------------+
               |        External 5V Power Supply + Common GND      |
               +--+-------------------------+-------------------+--+
                  |                         |                   |
        +---------+                         |                   +---------+
        |                                   |                             |
        v                                   v                             v
+---------------+                   +---------------+             +---------------+
| Arduino UNO 1 |                   | Arduino UNO 2 |             | Arduino UNO 3 |
| Gate & Display|                   | Traffic Light |             | Parking/Light |
+---+---+---+---+                   +---+-------+---+             +---+---+---+---+
    |   |   |                           |       |                     |   |   |
    |   |   +----------+                |       +-----------+         |   |   +----------+
    |   |              |                |                   |         |   |              |
    v   v              v                v                   v         v   v              v
[ RFID RC522 ]   [ Servo SG90 ]   [ Traffic N-S ]     [ Traffic E-W ] | [ HC-SR04 ]   [ LDR Sensor ]
  D10 (SDA)        D6 (Signal)      D2 (Red)            D5 (Red)      |   D7 (Trig)     A0 (Analog)
  D9  (RST)                         D3 (Yellow)         D6 (Yellow)   |   D8 (Echo)          |
  D11-D13 (SPI)                     D4 (Green)          D7 (Green)    |                      v
        |                                                             |               [ 2N2222 Driver ]
        v                                                             |                 D2 (Base)
 [ LCD 16x2 I2C ]                                                     |                      |
   A4 (SDA)                                                           v                      v
   A5 (SCL)                                                   [ Parking Slot ]        [ Street LEDs ]
