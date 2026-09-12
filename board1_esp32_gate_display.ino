#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ==========================================
// PIN DEFINITIONS (ESP32 DevKit V1)
// ==========================================
// RFID RC522 (VSPI Hardware Bus)
#define SS_PIN       5
#define RST_PIN      22
// VSPI Default: SCK=18, MISO=19, MOSI=23

// Actuators
#define SERVO_PIN    13

// I2C Pins for LCD 16x2
#define I2C_SDA      21
#define I2C_SCL      22 // หากพิน 22 ชนกับ RST ให้ย้าย RST_PIN ไป GPIO 4

// ==========================================
// OBJECTS & VARIABLES
// ==========================================
// แก้ปัญหาพินชนกัน: ให้ RST_PIN ใช้ GPIO 4
#undef RST_PIN
#define RST_PIN      4

MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime = 0;
bool isGateOpen = false;

void setup() {
  Serial.begin(115200);

  // เริ่มต้น I2C และจอ LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();

  // เริ่มต้น SPI และ RFID RC522
  SPI.begin(18, 19, 23, SS_PIN); // SCK, MISO, MOSI, SS
  rfid.PCD_Init();

  // ตั้งค่า Servo ด้วย ESP32Servo
  ESP32PWM::allocateTimer(0);
  gateServo.setPeriodHertz(50);
  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(0); // ปิดไม้กั้น

  lcd.setCursor(0, 0);
  lcd.print(" ESP32 GATEWAY  ");
  lcd.setCursor(0, 1);
  lcd.print(" GATE: CLOSED   ");
}

void loop() {
  unsigned long currentMillis = millis();

  // สแกนบัตร RFID
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    gateServo.write(90); // ยกไม้กั้นขึ้น
    isGateOpen = true;
    gateOpenTime = currentMillis;

    lcd.setCursor(0, 0);
    lcd.print(" ACCESS GRANTED ");
    lcd.setCursor(0, 1);
    lcd.print(" GATE: OPEN     ");

    rfid.PICC_HaltA();
  }

  // ปิดไม้กั้นอัตโนมัติเมื่อครบ 3 วินาที
  if (isGateOpen && (currentMillis - gateOpenTime >= 3000)) {
    gateServo.write(0);
    isGateOpen = false;

    lcd.setCursor(0, 0);
    lcd.print(" ESP32 GATEWAY  ");
    lcd.setCursor(0, 1);
    lcd.print(" GATE: CLOSED   ");
  }
}
