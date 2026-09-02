#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>

// ==========================================
// 1. PIN DEFINITIONS (การกำหนดขาบน ESP32)
// ==========================================
// RFID RC522 (SPI Bus)
#define SS_PIN          5
#define RST_PIN         22

// Actuators
#define SERVO_PIN       13
#define RELAY_PIN       2
#define BUZZER_PIN      4

// Sensors
#define TRIG_PARK       12
#define ECHO_PARK       14
#define LDR_PIN         34

// IC CD4017BE (Traffic Light Controller)
#define CD4017_CLK      16
#define CD4017_RST      17

// ==========================================
// 2. OBJECTS & CONSTANTS
// ==========================================
MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;

// Threshold values
const float PARK_THRESHOLD_CM = 8.0;   // ระยะตรวจจับรถจอด (cm)
const int   DARK_THRESHOLD     = 2500;  // ค่า LDR สว่างน้อย/มืด (0-4095)

// Timing Variables (millis)
unsigned long lastTrafficStep = 0;
unsigned long lastSensorRead  = 0;
const long TRAFFIC_INTERVAL   = 1000;  // เปลี่ยนจังหวะไฟทุก 1 วินาที
const long SENSOR_INTERVAL    = 500;   // อ่านค่าเซนเซอร์ทุก 0.5 วินาที

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================
// ฟังก์ชันอ่านระยะทางจาก Ultrasonic HC-SR04
float readUltrasonicDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 25000); // Timeout 25ms
  if (duration == 0) return 999.0;
  return duration * 0.0343 / 2.0;
}

// ==========================================
// 4. SETUP FUNCTION
// ==========================================
void setup() {
  Serial.begin(115200);
  SPI.begin();
  rfid.PCD_Init();

  // กำหนด Mode ของพอร์ต Digital
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(CD4017_CLK, OUTPUT);
  pinMode(CD4017_RST, OUTPUT);
  pinMode(TRIG_PARK, OUTPUT);
  pinMode(ECHO_PARK, INPUT);

  // สถานะเริ่มต้นของ Output
  digitalWrite(RELAY_PIN, HIGH);  // ปิด Relay (Active Low)
  digitalWrite(BUZZER_PIN, LOW);   // ปิดเสียง Buzzer
  
  // ตั้งค่า Servo ไม้กั้น
  gateServo.attach(SERVO_PIN);
  gateServo.write(0);             // ปิดไม้กั้นที่ 0 องศา

  // รีเซ็ต IC CD4017BE ให้อยู่ในตำแหน่งนับจังหวะแรก (Q0)
  digitalWrite(CD4017_RST, HIGH);
  delayMicroseconds(10);
  digitalWrite(CD4017_RST, LOW);

  Serial.println("==========================================");
  Serial.println("   ESP32 SMART CITY 4 SYSTEMS INITIALIZED ");
  Serial.println("==========================================");
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  // --------------------------------------------------
  // SYSTEM 3: RFID Gate Access (สแกนบัตรเปิดไม้กั้น)
  // --------------------------------------------------
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    Serial.print("[RFID System] Card Detected! UID:");
    for (byte i = 0; i < rfid.uid.size; i++) {
      Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
      Serial.print(rfid.uid.uidByte[i], HEX);
    }
    Serial.println("\n[RFID System] Access Granted -> Opening Gate...");

    // ส่งเสียงสัญญาณเตือน
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);

    // เปิดไม้กั้น ค้างไว้ 3 วินาที แล้วปิด
    gateServo.write(90);
    delay(3000);
    gateServo.write(0);
    Serial.println("[RFID System] Gate Closed.");

    rfid.PICC_HaltA();
  }

  // --------------------------------------------------
  // SYSTEM 1: Smart Traffic Light (ไฟจราจรอัตโนมัติ)
  // --------------------------------------------------
  if (millis() - lastTrafficStep >= TRAFFIC_INTERVAL) {
    lastTrafficStep = millis();
    
    // ส่งสัญญาณ Pulse ให้ IC CD4017BE ขยับไปขั้นถัดไป
    digitalWrite(CD4017_CLK, HIGH);
    delayMicroseconds(5);
    digitalWrite(CD4017_CLK, LOW);
  }

  // --------------------------------------------------
  // SYSTEM 2 & 4: Parking & Street Light Sensors
  // --------------------------------------------------
  if (millis() - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = millis();

    // 2.1 ตรวจจับช่องจอดรถ (Smart Parking)
    float distance = readUltrasonicDistance(TRIG_PARK, ECHO_PARK);
    if (distance <= PARK_THRESHOLD_CM && distance > 0) {
      Serial.printf("[Parking System] Status: OCCUPIED (Dist: %.1f cm)\n", distance);
    } else {
      Serial.printf("[Parking System] Status: VACANT (Dist: %.1f cm)\n", distance);
    }

    // 2.2 ตรวจวัดแสงสว่างไฟถนน (Smart Street Light)
    int ldrValue = analogRead(LDR_PIN);
    if (ldrValue >= DARK_THRESHOLD) {
      digitalWrite(RELAY_PIN, LOW); // เปิดไฟถนน (Active Low)
      Serial.printf("[Street Light] Status: ON (Dark Level: %d)\n", ldrValue);
    } else {
      digitalWrite(RELAY_PIN, HIGH); // ปิดไฟถนน
      Serial.printf("[Street Light] Status: OFF (Light Level: %d)\n", ldrValue);
    }
  }
}
