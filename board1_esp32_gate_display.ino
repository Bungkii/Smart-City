#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ESP32Servo.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "time.h"

// ==========================================
// 1. TIME SERVER (NIMT) & SCRIPT CONFIG
// ==========================================
const char* ntpServer   = "time1.nimt.or.th";
const long  gmtOffset_sec = 7 * 3600;  // เขตเวลาไทย GMT+7 (7 ชั่วโมง x 3600 วินาที)
const int   daylightOffset_sec = 0;    // ประเทศไทยไม่มี Daylight Saving

// วาง Web App URL จาก Google Apps Script (ลงท้ายด้วย /exec)
const String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkGglMWJAnvbjXmdD76vRydjr7f1pQEttifQQ3ItVb42b96XoBfOG7DmGBBVlDN5DQGQ/exec";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
#define SS_PIN       5
#define RST_PIN      4
#define SERVO_PIN    13
#define BUZZER_PIN   15   // ต่อเข้า I/O ของ Buzzer
#define I2C_SDA      21
#define I2C_SCL      22

MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime = 0;
bool isGateOpen = false;

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

// ฟังก์ชันดึงเวลาปัจจุบันในรูปแบบ "HH:MM"
String getLocalTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    Serial.println("[NTP] Failed to obtain time");
    return "--:--";
  }
  char timeStr[6];
  strftime(timeStr, sizeof(timeStr), "%H:%M", &timeinfo);
  return String(timeStr);
}

// ฟังก์ชันส่งเสียงเตือนกรณี Banned (ปิ๊บๆ)
void triggerBannedAlarm() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(120);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

// ตรวจสอบสิทธิ์บัตรผ่าน Google Apps Script
String verifyCard(String cardUID, String &roleOut) {
  if (WiFi.status() != WL_CONNECTED) return "wifi_lost";

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(10000);

  HTTPClient http;
  String fullURL = SCRIPT_URL + "?card_id=" + cardUID;
  http.begin(client, fullURL);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  int httpCode = http.GET();
  String resultStatus = "error";

  if (httpCode == HTTP_CODE_OK || httpCode == 302) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (!error) {
      resultStatus = doc["status"].as<String>();
      roleOut      = doc["role"].as<String>();
    }
  }
  http.end();
  return resultStatus;
}

// ==========================================
// 4. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();

  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();

  ESP32PWM::allocateTimer(0);
  gateServo.setPeriodHertz(50);
  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(0);

  // เริ่มต้นระบบ WiFiManager ปล่อย Hotspot หากยังไม่ได้เชื่อมต่อ
  lcd.setCursor(0, 0);
  lcd.print("CONNECTING WIFI ");
  lcd.setCursor(0, 1);
  lcd.print("OR SETUP AP...  ");

  WiFiManager wm;
  // ชื่อ Wi-Fi AP ที่บอร์ดจะปล่อยออกมาให้ตั้งค่า
  bool res = wm.autoConnect("SmartCity-Gateway-AP");

  if (!res) {
    Serial.println("[WiFiManager] Failed to connect, restarting...");
    ESP.restart();
  }

  Serial.println("[WiFi] Connected! Local IP: " + WiFi.localIP().toString());
  
  // ซิงก์เวลากับสถาบันมาตรวิทยาแห่งชาติ (time1.nimt.or.th)
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SYNCING TIME... ");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  struct tm timeinfo;
  while (!getLocalTime(&timeinfo)) {
    delay(200);
    Serial.print(".");
  }
  Serial.println("\nTime Synchronized!");

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(" ESP32 GATEWAY  ");
  lcd.setCursor(0, 1);
  lcd.print(" GATE: CLOSED   ");
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // สแกนบัตร RFID
  if (!isGateOpen && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
      cardUID += String(rfid.uid.uidByte[i], HEX);
    }
    cardUID.toUpperCase();

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("CHECKING ID...  ");
    lcd.setCursor(0, 1);
    lcd.print(cardUID);

    String role = "";
    String authStatus = verifyCard(cardUID, role);
    String currentTime = getLocalTimeString(); // ดึงเวลา HH:MM จาก time1.nimt.or.th

    if (authStatus == "allow") {
      lcd.clear();
      // บรรทัดที่ 1: "Welcome"
      lcd.setCursor(0, 0);
      lcd.print("Welcome");

      // บรรทัดที่ 2: "[Role]   HH:MM" รวมไม่เกิน 16 ตัวอักษร
      lcd.setCursor(0, 1);
      int maxRoleLen = 16 - 1 - currentTime.length();
      if (role.length() > maxRoleLen) {
        role = role.substring(0, maxRoleLen);
      }
      String line2 = role;
      while (line2.length() + currentTime.length() < 16) {
        line2 += " ";
      }
      line2 += currentTime;
      lcd.print(line2);

      // ยกไม้กั้นขึ้น
      gateServo.write(90);
      isGateOpen = true;
      gateOpenTime = millis();
    } 
    else if (authStatus == "banned") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("CARD BANNED!");
      lcd.setCursor(0, 1);
      lcd.print(role.length() > 16 ? role.substring(0, 16) : role);
      
      triggerBannedAlarm(); // ส่งเสียง ปิ๊บๆ
      delay(2000);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(" ESP32 GATEWAY  ");
      lcd.setCursor(0, 1);
      lcd.print(" GATE: CLOSED   ");
    } 
    else {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("ACCESS DENIED");
      lcd.setCursor(0, 1);
      lcd.print("NOT REGISTERED");
      delay(2000);

      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(" ESP32 GATEWAY  ");
      lcd.setCursor(0, 1);
      lcd.print(" GATE: CLOSED   ");
    }

    rfid.PICC_HaltA();
  }

  // ปิดไม้กั้นลงหลังครบ 3 วินาที
  if (isGateOpen && (currentMillis - gateOpenTime >= 3000)) {
    gateServo.write(0);
    isGateOpen = false;

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(" ESP32 GATEWAY  ");
    lcd.setCursor(0, 1);
    lcd.print(" GATE: CLOSED   ");
  }
}
