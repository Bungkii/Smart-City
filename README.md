# 🏙️ Hybrid Distributed Smart City Model (1x ESP32 + 2x Arduino UNO)

แบบจำลองเมืองอัจฉริยะ (Smart City) สถาปัตยกรรมแบบกระจายศูนย์ (Distributed Architecture) ที่ผสานการทำงานร่วมกันระหว่าง **ESP32 IoT Gateway (Board 1)** และ **Arduino UNO R3 Local Controllers (Board 2 & 3)** พร้อมระบบฐานข้อมูลคลาวด์สองทาง (Cloud Database & Access Logging) ผ่าน Google Sheets

---

## 📌 Key Features (ฟังก์ชันการทำงานหลัก)

### 1. 💳 Smart Cloud Gateway & Access Control (Board 1 - ESP32 DevKit V1)
* **Captive Portal Wi-Fi Configuration:** เมื่อเปิดเครื่องหรือกดปุ่ม `BOOT` (GPIO 0) ค้างไว้ ระบบจะปล่อย Hotspot AP ชื่อ `SmartCity-Gateway-AP` พร้อม Web Portal (`192.168.4.1`) ให้สแกนและบันทึกค่า Wi-Fi ลงหน่วยความจำถาวรได้ทันที
* **National Standard Time Sync (NTP):** ซิงก์เวลาความละเอียดสูงจากเซิร์ฟเวอร์สถาบันมาตรวิทยาแห่งชาติ (`time1.nimt.or.th`) ประจำเขตเวลาประเทศไทย (GMT+7)
* **Cloud Card Authentication (Google Sheets API):** สแกนบัตร/เหรียญ RFID (RC522) เพื่อส่ง UID ไปตรวจสอบสิทธิ์ผ่าน Google Apps Script Web API:
  * **สถานะ Allow:** สั่งงานเซอร์โวมอเตอร์ (SG90) ยกไม้กั้น 90 องศา ค้างไว้ 3 วินาทีแล้วปิดลง พร้อมบันทึก Timestamp (`YYYY-MM-DD HH:mm:ss`) และ `Card_id` ลงแท็บ `Logs` อัตโนมัติ
  * **สถานะ Banned:** ปฏิเสธการเปิดไม้กั้น พร้อมส่งสัญญาณเตือนผ่าน Active Buzzer (เสียงปิ๊บๆ ต่อเนื่อง)
  * **สถานะ Not Registered:** ปฏิเสธการเข้าด่านและแจ้งเตือนผ่านหน้าจอ
* **Dynamic Smart LCD Display (16x2 I2C):**
  * *โหมด Standby:* บรรทัดบนแสดงเวลาปัจจุบัน `Welcome   HH:MM` และบรรทัดล่างแสดงข้อความเลื่อน (Auto-scroll) `Assumption College Thonburi`
  * *เมื่อแตะบัตรสำเร็จ:* แสดงเวลาและเปลี่ยนบรรทัดล่างเป็น `[Card UID] [Role]` (เช่น `4A6F12C3 Student`)

### 2. 🚦 Autonomous Intersection Traffic Light (Board 2 - Arduino UNO R3)
* ควบคุมสัญญาณไฟจราจรสี่แยก 2 ทิศทางอิสระ (North-South และ East-West) ด้วยหลอด LED 6 ดวง
* ลำดับการทำงาน 4 จังหวะต่อเนื่อง (Green $\rightarrow$ Yellow $\rightarrow$ Red) โดยใช้ `millis()` แบบ Non-blocking ตัดปัญหาอาการหน่วงหรือสะดุดจากการสื่อสารเน็ตเวิร์ก

### 3. 🅿️ Smart Parking & Automated Street Light (Board 3 - Arduino UNO R3)
* **Ultrasonic Smart Parking (HC-SR04):** ตรวจจับระยะห่างรถยนต์ที่เข้าจอดในช่องซองจอด (P) แบบ Real-time เพื่อแยกสถานะ Occupied/Free
* **LDR Smart Street Light (2N2222 Driver):** ตรวจวัดค่าความสว่างแสงธรรมชาติผ่านวงจร Voltage Divider สั่งเปิด-ปิดไฟถนน (ชุดหลอด LED สีขาว) ผ่านวงจรสวิตช์ขับกระแสทรานซิสเตอร์ NPN 2N2222 โดยอัตโนมัติ

---

## 🛠️ Hardware Requirements (รายการอุปกรณ์)

* **Microcontrollers:**
  * ESP32 DevKit V1 (30 Pins / NodeMCU-32S) x 1
  * Arduino UNO R3 x 2
* **Zone 1: Gate & Display Components:**
  * โมดูล RFID RC522 (13.56 MHz SPI) + แท็ก/บัตร x 1
  * เซอร์โวมอเตอร์ Micro Servo SG90 x 1
  * โมดูลจอ LCD 16x2 พร้อม I2C Backpack Interface x 1
  * Active Buzzer 5V (Active LOW) x 1
* **Zone 2: Traffic Light Components:**
  * ชุดโมดูลไฟจราจร หรือ LED 5mm (แดง 2, เหลือง 2, เขียว 2) x 6
  * ตัวต้านทาน 220Ω x 6
* **Zone 3: Parking & Street Light Components:**
  * เซนเซอร์วัดระยะ Ultrasonic HC-SR04 x 1
  * เซนเซอร์วัดแสง Photoresistor (LDR) x 1
  * ทรานซิสเตอร์ NPN 2N2222 x 1
  * ชุดหลอด LED สีขาวสำหรับไฟถนน
  * ตัวต้านทาน: 10kΩ (วงจร LDR), 1kΩ (ขา Base ทรานซิสเตอร์), 220Ω (จำกัดกระแส LED)
* **Power Supply & Mechanical:**
  * แหล่งจ่ายไฟภายนอก 5V DC (Power Supply Module / Common Adapter)
  * Breadboard และสายจัมเปอร์ (Male-to-Male, Male-to-Female)
  * กิ๊บล็อกถนน (Road Connector Clips) พร้อมแกนสวมเสาโมเดลและช่องร้อยสายไฟ

---

## 🔌 Pin Assignment Table (ตารางกำหนดขาใช้งาน)

### 📍 Board 1: ESP32 IoT Gateway Controller
| โมดูล / อุปกรณ์ | ขาบนอุปกรณ์ | ขาบน ESP32 (GPIO) | ประเภทสัญญาณ | รายละเอียดเพิ่มเติม |
| :--- | :--- | :--- | :--- | :--- |
| **RFID RC522** | 3.3V / GND | **3V3 / GND** | Power | **คำเตือน:** ห้ามจ่าย 5V เข้า RC522 เด็ดขาด |
| | SDA (SS) | **GPIO 5** | Digital Out | Chip Select |
| | SCK | **GPIO 18** | SPI SCK | VSPI Bus |
| | MOSI | **GPIO 23** | SPI MOSI | VSPI Bus |
| | MISO | **GPIO 19** | SPI MISO | VSPI Bus |
| | RST | **GPIO 4** | Digital Out | Reset Pin |
| | IRQ | *(ไม่ต่อ)* | - | ปล่อยว่าง |
| **Servo SG90** | Signal (ส้ม/เหลือง) | **GPIO 13** | PWM Output | คุมองศาไม้กั้น (0° - 90°) |
| | VCC / GND | **External 5V / GND** | Power | จ่ายไฟตรงจากราง 5V ภายนอก |
| **LCD 16x2 (I2C)**| SDA / SCL | **GPIO 21 / GPIO 22**| I2C Bus | ที่อยู่ I2C: `0x27` หรือ `0x3F` |
| | VCC / GND | **5V (VIN) / GND** | Power | |
| **Active Buzzer** | I/O (Signal) | **GPIO 25** | Digital Out | ควบคุมแบบ Active LOW |
| | VCC / GND | **5V / GND** | Power | |
| **System Button** | Push Button | **GPIO 0 (BOOT)** | Digital In | ดึงขากราวด์ตอนบูตเพื่อ Reset Wi-Fi |

### 📍 Board 2: Intersection Traffic Controller (Arduino UNO R3)
| ทิศทางไฟจราจร | สัญญาณไฟ LED | ขาบน Arduino UNO | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **North-South (N-S)** | แดง (Red) | **Pin D2** | Digital Output |
| | เหลือง (Yellow) | **Pin D3** | Digital Output |
| | เขียว (Green) | **Pin D4** | Digital Output |
| **East-West (E-W)** | แดง (Red) | **Pin D5** | Digital Output |
| | เหลือง (Yellow) | **Pin D6** | Digital Output |
| | เขียว (Green) | **Pin D7** | Digital Output |
| **Power Rail** | Common GND | **GND** | Common Ground |

### 📍 Board 3: Parking & Street Light Controller (Arduino UNO R3)
| โมดูล / เซนเซอร์ | ขาบนอุปกรณ์ | ขาบน Arduino UNO | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **Ultrasonic HC-SR04** | Trig | **Pin D7** | Digital Output |
| | Echo | **Pin D8** | Digital Input |
| | VCC / GND | **5V / GND** | Power |
| **LDR Light Sensor** | V-Divider Out | **Pin A0** | Analog Input (ADC) |
| **2N2222 Driver** | ขา Base (ผ่าน R 1kΩ)| **Pin D2** | Digital Output (คุมชุดไฟถนน) |
| **Power Rail** | Common GND | **GND** | Common Ground ร่วม |

---

## 🗺️ System Architecture Diagram

```text
               +-------------------------------------------------------------------+
               |               External 5V Power Supply + Common GND               |
               +--------+--------------------------+----------------------+--------+
                        |                          |                      |
             +----------+                          |                      +----------+
             |                                     |                                 |
             v                                     v                                 v
     +---------------+                     +---------------+                 +---------------+
     | ESP32 DevKit  |                     | Arduino UNO 2 |                 | Arduino UNO 3 |
     | Gate & Cloud  |                     | Traffic Light |                 | Parking/Light |
     +---+---+---+---+                     +---+-------+---+                 +---+---+---+---+
         |   |   |                             |       |                         |   |   |
         |   |   +----------+                  |       +-----------+             |   |   +----------+
         |   |              |                  |                   |             |   |              |
         |   |              v                  v                   v             |   |              v
         |   |        [ Servo SG90 ]     [ Traffic N-S ]     [ Traffic E-W ]     |   |       [ LDR Sensor ]
         |   |         GPIO 13 (PWM)       D2 (Red)            D5 (Red)          |   |        A0 (Analog)
         |   |                             D3 (Yellow)         D6 (Yellow)       |   |             |
         |   |        [ Buzzer 5V ]        D4 (Green)          D7 (Green)        |   |             v
         |   |         GPIO 25 (I/O)                                             |   |     [ 2N2222 Driver ]
         |   v                                                                   |   |        D2 (Base)
         | [ LCD 16x2 I2C ]                                                      |   |             |
         |   GPIO 21 (SDA)                                                       v   |             v
         |   GPIO 22 (SCL)                                                 [ HC-SR04 ]      [ Street LEDs ]
         v                                                                   D7 (Trig)
  [ RFID RC522 ]                                                             D8 (Echo)
    GPIO 5  (SDA)                                                                |
    GPIO 4  (RST)                                                                v
    GPIO 18 (SCK)                                                         [ Parking Slot ]
    GPIO 23 (MOSI)
    GPIO 19 (MISO)
         :
         v (Wi-Fi 2.4GHz HTTPS)
  +------------------------------------+
  | Google Sheets (Database & Logs)    |
  | Apps Script API Webhook Engine     |
  +------------------------------------+
