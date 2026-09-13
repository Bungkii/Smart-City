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
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

const String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkGglMWJAnvbjXmdD76vRydjr7f1pQEttifQQ3ItVb42b96XoBfOG7DmGBBVlDN5DQGQ/exec";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
#define SS_PIN       5
#define RST_PIN      4
#define SPI_SCK      18
#define SPI_MISO     19
#define SPI_MOSI     21

#define I2C_SDA      23
#define I2C_SCL      22

#define SERVO_PIN    13
#define BUZZER_PIN   25
#define RESET_PIN    0   // ปุ่ม BOOT บนบอร์ด

#define BUZZER_ON    LOW
#define BUZZER_OFF   HIGH

MFRC522 rfid(SS_PIN, RST_PIN);
Servo gateServo;
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime = 0;
bool isGateOpen = false;

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
    return "--:--:--";
  }
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  return String(timeStr);
}

void beepBuzzer(int count) {
  for (int i = 0; i < count; i++) {
    digitalWrite(BUZZER_PIN, BUZZER_ON);
    delay(100);
    digitalWrite(BUZZER_PIN, BUZZER_OFF);
    if (i < count - 1) delay(100);
  }
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
}

String verifyCard(String cardUID, String &roleOut, String &actionOut) {
  if (WiFi.status() != WL_CONNECTED) return "wifi_lost";

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(10000);

  HTTPClient http;
  String fullURL = SCRIPT_URL + "?card_id=" + cardUID;
  http.begin(client, fullURL);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);

  int httpCode = http.GET();
  String resultStatus = "not_found";

  if (httpCode == HTTP_CODE_OK || httpCode == 302) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, payload);
    if (!error) {
      resultStatus = doc["status"].as<String>();
      roleOut      = doc["role"].as<String>();
      actionOut    = doc["action"].as<String>();
    }
  }
  http.end();
  return resultStatus;
}

void updateTopLineWelcome() {
  String currentTime = getLocalTimeString();
  lcd.setCursor(0, 0);
  String topLine = "Welcome " + currentTime;
  while (topLine.length() < 16) topLine += " ";
  lcd.print(topLine);
}

void scrollSchoolText() {
  if (millis() - lastScrollTime >= 350) {
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

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.clear();
  lcd.backlight();

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SS_PIN);
  rfid.PCD_Init();

  ESP32PWM::allocateTimer(0);
  gateServo.setPeriodHertz(50);
  gateServo.attach(SERVO_PIN, 500, 2400);
  gateServo.write(0);

  WiFiManager wm;

  // กดปุ่ม BOOT ค้างตอนเปิดเครื่องเพื่อสั่ง Reset ทันที
  if (digitalRead(RESET_PIN) == LOW) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("RESETTING WIFI..");
    wm.resetSettings();
    beepBuzzer(2);
    delay(1500);
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

  // ระบบเตรียมพร้อมสมบูรณ์ -> Beep 1 ครั้งแจ้งเตือน
  beepBuzzer(1);

  lcd.clear();
  updateTopLineWelcome();
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  unsigned long currentMillis = millis();

  // ตรวจจับการกดปุ่ม BOOT (GPIO 0) ค้าง 2 วินาที เพื่อล้าง Wi-Fi ขณะทำงาน
  if (digitalRead(RESET_PIN) == LOW) {
    delay(100);
    if (digitalRead(RESET_PIN) == LOW) {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("HOLD TO RESET...");
      unsigned long btnPressTime = millis();
      while (digitalRead(RESET_PIN) == LOW) {
        if (millis() - btnPressTime >= 2000) {
          lcd.clear();
          lcd.setCursor(0, 0);
          lcd.print("RESETTING WIFI..");
          WiFiManager wm;
          wm.resetSettings();
          beepBuzzer(2);
          delay(1000);
          ESP.restart();
        }
      }
      lcd.clear();
      updateTopLineWelcome();
    }
  }

  // แสดงผลหน้าจอขณะไม่ได้เปิดไม้กั้น
  if (!isGateOpen) {
    if (currentMillis - lastClockUpdate >= 1000) {
      lastClockUpdate = currentMillis;
      updateTopLineWelcome();
    }
    scrollSchoolText();
  }

  // ตรวจจับการแตะบัตร
  if (!isGateOpen && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
      cardUID += String(rfid.uid.uidByte[i], HEX);
    }
    cardUID.toUpperCase();

    lcd.setCursor(0, 1);
    lcd.print("CHECKING ID...  ");

    String role = "";
    String action = "entry";
    String authStatus = verifyCard(cardUID, role, action);

    if (authStatus == "banned") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("CARD BANNED!");
      lcd.setCursor(0, 1);
      lcd.print(role.length() > 0 ? role : cardUID);
      beepBuzzer(3);
      delay(3000);
      lcd.clear();
      updateTopLineWelcome();
    } 
    else {
      if (authStatus == "allow") {
        beepBuzzer(1);
      } else {
        beepBuzzer(2);
        role = "TempUser";
      }

      lcd.clear();
      if (action == "exit") {
        lcd.setCursor(0, 0);
        lcd.print("THANK YOU       ");
      } else {
        updateTopLineWelcome();
      }

      String displayLine = cardUID + " " + role;
      while (displayLine.length() < 16) displayLine += " ";
      if (displayLine.length() > 16) displayLine = displayLine.substring(0, 16);

      lcd.setCursor(0, 1);
      lcd.print(displayLine);

      gateServo.write(90);
      isGateOpen = true;
      gateOpenTime = millis();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ปิดไม้กั้นหลังครบ 3 วินาที
  if (isGateOpen && (currentMillis - gateOpenTime >= 3000)) {
    gateServo.write(0);
    isGateOpen = false;

    lcd.clear();
    updateTopLineWelcome();
    scrollPos = 0;
  }
}
