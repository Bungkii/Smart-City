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
// 1. CONFIGURATION
// ==========================================
const char* ntpServer     = "time1.nimt.or.th";
const long  gmtOffset_sec = 7 * 3600;  // เขตเวลาไทย GMT+7
const int   daylightOffset_sec = 0;

const String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkGglMWJAnvbjXmdD76vRydjr7f1pQEttifQQ3ItVb42b96XoBfOG7DmGBBVlDN5DQGQ/exec";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
#define SS_PIN       5
#define RST_PIN      4
#define SERVO_PIN    13
#define BUZZER_PIN   25
#define I2C_SDA      23
#define I2C_SCL      22
#define RESET_PIN    0

#define BUZZER_ON    LOW
#define BUZZER_OFF   HIGH

MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;
// หากยังขึ้นจอขาว ให้ลองเปลี่ยน 0x27 เป็น 0x3F
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime = 0;
bool isGateOpen = false;

// ตัวแปรสำหรับจัดการหน้าจอและเลื่อนตัวอักษร
unsigned long lastClockUpdate = 0;
unsigned long lastScrollTime = 0;
int scrollPos = 0;
String schoolText = "Assumption College Thonburi    ";

// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

String getLocalTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "--:--";
  }
  char timeStr[6];
  strftime(timeStr, sizeof(timeStr), "%H:%M", &timeinfo);
  return String(timeStr);
}

void triggerBannedAlarm() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, BUZZER_ON);
    delay(120);
    digitalWrite(BUZZER_PIN, BUZZER_OFF);
    delay(100);
  }
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

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

// อัปเดตบรรทัดบน: "Welcome    HH:MM"
void updateTopLineWelcome() {
  String currentTime = getLocalTimeString();
  lcd.setCursor(0, 0);
  // ความกว้าง 16 ตัวอักษร: "Welcome    " + "HH:MM"
  String topLine = "Welcome   " + currentTime;
  while (topLine.length() < 16) topLine += " ";
  lcd.print(topLine);
}

// เลื่อนข้อความโรงเรียนที่บรรทัดล่าง
void scrollSchoolText() {
  if (millis() - lastScrollTime >= 350) { // ความเร็วในการเลื่อน
    lastScrollTime = millis();
    lcd.setCursor(0, 1);
    
    String displayStr = "";
    for (int i = 0; i < 16; i++) {
      int charIndex = (scrollPos + i) % schoolText.length();
      displayStr += schoolText.charAt(charIndex);
    }
    lcd.print(displayStr);

    scrollPos++;
    if (scrollPos >= schoolText.length()) {
      scrollPos = 0;
    }
  }
}

// ==========================================
// 4. SETUP
// ==========================================
void setup() {
  Serial.begin(115200);

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
  pinMode(RESET_PIN, INPUT_PULLUP);

  // เริ่มต้นจอ LCD
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.clear();
  lcd.backlight();

  SPI.begin(18, 19, 23, SS_PIN);
  rfid.PCD_Init();

  ESP32PWM::allocateTimer(0);
  gateServo.setPeriodHertz(50);
  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(0);

  WiFiManager wm;

  if (digitalRead(RESET_PIN) == LOW) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("RESETTING WIFI..");
    wm.resetSettings();
    delay(2000);
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("WiFi: SmartCity ");
  lcd.setCursor(0, 1);
  lcd.print("IP: 192.168.4.1 ");

  if (!wm.autoConnect("SmartCity-Gateway-AP")) {
    ESP.restart();
  }

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("SYNCING TIME... ");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  struct tm timeinfo;
  int retry = 0;
  while (!getLocalTime(&timeinfo) && retry < 20) {
    delay(300);
    retry++;
  }

  lcd.clear();
  updateTopLineWelcome();
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // จัดการหน้าจอสถานะปกติ (เมื่อไม่มีการเปิดไม้กั้น)
  if (!isGateOpen) {
    // อัปเดตเวลานาทีละครั้ง หรือทุก 1 วินาที
    if (currentMillis - lastClockUpdate >= 1000) {
      lastClockUpdate = currentMillis;
      updateTopLineWelcome();
    }
    // เลื่อนข้อความ Assumption College Thonburi
    scrollSchoolText();
  }

  // ตรวจจับการแตะบัตร RFID
  if (!isGateOpen && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
      cardUID += String(rfid.uid.uidByte[i], HEX);
    }
    cardUID.toUpperCase();

    // แสดงสถานะกำลังเช็ก
    lcd.setCursor(0, 1);
    lcd.print("CHECKING ID...  ");

    String role = "";
    String authStatus = verifyCard(cardUID, role);

    if (authStatus == "allow") {
      updateTopLineWelcome();

      // บรรทัดล่าง: แสดง UID บัตร และ Role
      String line2 = cardUID + " " + role;
      while (line2.length() < 16) line2 += " ";
      if (line2.length() > 16) line2 = line2.substring(0, 16);

      lcd.setCursor(0, 1);
      lcd.print(line2);

      // ยกไม้กั้นขึ้น
      gateServo.write(90);
      isGateOpen = true;
      gateOpenTime = millis();
    } 
    else if (authStatus == "banned") {
      lcd.setCursor(0, 1);
      lcd.print("BANNED: " + (cardUID.length() > 8 ? cardUID.substring(0, 8) : cardUID));
      triggerBannedAlarm();
      delay(2000);
      lcd.clear();
      updateTopLineWelcome();
    } 
    else {
      lcd.setCursor(0, 1);
      lcd.print("DENIED: " + (cardUID.length() > 8 ? cardUID.substring(0, 8) : cardUID));
      delay(2000);
      lcd.clear();
      updateTopLineWelcome();
    }

    rfid.PICC_HaltA();
  }

  // ปิดไม้กั้นลงหลังครบ 3 วินาที แล้วกลับสู่หน้าจอปกติ
  if (isGateOpen && (currentMillis - gateOpenTime >= 3000)) {
    gateServo.write(0);
    isGateOpen = false;

    lcd.clear();
    updateTopLineWelcome();
    scrollPos = 0; // รีเซ็ตตำแหน่งเลื่อนข้อความ
  }
}
