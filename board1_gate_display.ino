#include <SPI.h>
#include <MFRC522.h>
#include <Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// PIN DEFINITIONS
#define SS_PIN     10
#define RST_PIN    9
#define SERVO_PIN  6

MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime = 0;
bool isGateOpen = false;

void setup() {
  Serial.begin(9600);
  SPI.begin();
  rfid.PCD_Init();

  lcd.init();
  lcd.backlight();

  gateServo.attach(SERVO_PIN);
  gateServo.write(0); // ปิดไม้กั้นเริ่มต้นที่ 0 องศา

  lcd.setCursor(0, 0);
  lcd.print(" SMART GATEWAY ");
  lcd.setCursor(0, 1);
  lcd.print(" GATE: CLOSED  ");
}

void loop() {
  unsigned long currentMillis = millis();

  // ตรวจจับการแตะบัตร RFID
  if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    gateServo.write(90); // ยกไม้กั้นขึ้น
    isGateOpen = true;
    gateOpenTime = currentMillis;

    lcd.setCursor(0, 0);
    lcd.print(" ACCESS GRANTED ");
    lcd.setCursor(0, 1);
    lcd.print(" GATE: OPEN    ");

    rfid.PICC_HaltA();
  }

  // ปิดไม้กั้นอัตโนมัติเมื่อครบ 3 วินาที
  if (isGateOpen && (currentMillis - gateOpenTime >= 3000)) {
    gateServo.write(0);
    isGateOpen = false;

    lcd.setCursor(0, 0);
    lcd.print(" SMART GATEWAY ");
    lcd.setCursor(0, 1);
    lcd.print(" GATE: CLOSED  ");
  }
}
