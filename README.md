# 🏙️ ESP32 Smart City Model (4 Systems DIY)

แบบจำลองเมืองอัจฉริยะ (Smart City) ขนาด 100x100 ซม. ควบคุมการทำงานด้วยไมโครคอนโทรลเลอร์ **ESP32** รองรับการทำงานแบบมัลติทาสก์ (Non-blocking using `millis()`) รวม 4 ระบบหลักเข้าไว้ด้วยกันในบอร์ดเดียว

---

## 📌 Features (ระบบการทำงาน 4 ระบบหลัก)

1. 🚦 **Smart Traffic Light (ระบบไฟจราจรอัตโนมัติ):** ควบคุมสัญญาณไฟจราจร 2 ทิศทาง สลับไฟแดง-เหลือง-เขียว อัตโนมัติผ่าน IC CD4017BE เพื่อประหยัดขา GPIO
2. 🅿️ **Smart Parking (ระบบตรวจจับช่องจอดรถ):** วัดระยะการเข้าจอดด้วย Ultrasonic Sensor (HC-SR04) สรุปสถานะช่องจอดว่าง/ไม่ว่าง
3. 💳 **RFID Gate Access (ระบบไม้กั้นเข้าเมืองแบบแตะบัตร):** สแกนบัตร RFID (RC522) เพื่อตรวจสอบสิทธิ์ สั่งงาน Servo Motor (SG90) ยกไม้กั้นขึ้นพร้อมเสียงสัญญาณ Buzzer
4. 💡 **Smart Street Light (ระบบไฟถนนเปิด-ปิดอัตโนมัติ):** ตรวจจับระดับความสว่างด้วย LDR Sensor และสั่งเปิด-ปิดไฟถนนผ่านโมดูล Relay 1 ช่องในเวลากลางคืน

---

## 🛠️ Hardware Requirements (อุปกรณ์ที่ใช้)

* **Main Controller:** บอร์ด ESP32 Development Board x 1
* **RFID Access System:** โมดูล RFID RC522 + บัตร/พวงกุญแจ x 1
* **Gate Control:** เซอร์โวมอเตอร์ Servo SG90 x 1
* **Parking Sensor:** เซนเซอร์ Ultrasonic HC-SR04 x 1
* **Light Sensor:** เซนเซอร์ LDR (Light Dependent Resistor) Module x 1
* **Street Light Actuator:** โมดูล Relay 1 ช่อง 5V x 1
* **Traffic Control:** IC CD4017BE (Decade Counter) x 1 + โมดูลไฟจราจร 5V x 4
* **Audio Feedback:** Active Buzzer 5V x 1
* **Breadboard & Wires:** Breadboard 830 รู และ สายจัมเปอร์ (Jumper Wires)

---

## 🔌 Pin Assignment Table (ผังการต่อขาบน ESP32)

| อุปกรณ์ | ขาของอุปกรณ์ | ขาต่อบน ESP32 | ประเภทสัญญาณ |
| :--- | :--- | :--- | :--- |
| **RFID RC522** | SDA / SCK / MOSI / MISO / RST | **GPIO 5 / 18 / 23 / 19 / 22** | SPI Bus |
| **Servo SG90** | Signal (สายสีส้ม) | **GPIO 13** | PWM |
| **Ultrasonic HC-SR04** | Trig / Echo | **GPIO 12 / GPIO 14** | Digital Out / In |
| **LDR Sensor** | Analog Out (AO) | **GPIO 34** | Analog Input (ADC) |
| **Relay Module 1-CH** | IN | **GPIO 2** | Digital Output |
| **IC CD4017BE** | CLK (Pin 14) / RST (Pin 15) | **GPIO 16 / GPIO 17** | Digital Output |
| **Active Buzzer** | Signal (+) | **GPIO 4** | Digital Output |
| **Power Supply** | VCC / GND | **5V / GND** | Common GND Rail |

---

## 🗺️ System Architecture

```text
                     +-----------------------------------+
                     |           ESP32 Micro             |
                     |           Controller              |
                     +--+--------+--------+-----------+--+
                        |        |        |           |
        +---------------+        |        |           +-------------------+
        |                        |        |                               |
        v                        v        v                               v
[ System 1: Traffic ]   [ System 2: Park ]  [ System 3: RFID Gate ]  [ System 4: Street Light ]
  GPIO 16 (CLK)           GPIO 12 (Trig)      SPI Pins (4, 18, 23, 19)  GPIO 34 (LDR AO)
  GPIO 17 (RST)           GPIO 14 (Echo)      GPIO 13 (Servo Sig)       GPIO 2 (Relay IN)
        |                        |                    |                        |
        v                        v                    v                        v
  [ CD4017BE IC ]         [ HC-SR04 Sensor ]  [ RFID RC522 Scanner ]    [ LDR Sensor Module ]
        |                                             |                        |
        v                                             v                        v
  [ Traffic LEDs ]                             [ Servo SG90 Gate ]       [ Street Light Relay ]
