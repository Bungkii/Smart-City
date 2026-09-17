#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "time.h"

// ==========================================
// 1. CONFIGURATION
// ==========================================
const char* ntpServer     = "time1.nimt.or.th";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

// URL Google Apps Script Web App
const String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkGglMWJAnvbjXmdD76vRydjr7f1pQEttifQQ3ItVb42b96XoBfOG7DmGBBVlDN5DQGQ/exec";

// ==========================================
// 2. PIN DEFINITIONS
// ==========================================
// RFID SPI Pins
#define SS_PIN       5    
#define RST_PIN      4    
#define SPI_SCK      18   
#define SPI_MISO     19   
#define SPI_MOSI     21

// LCD 16x2 I2C Pins
#define I2C_SDA      23
#define I2C_SCL      22

// Actuators & Controls
#define GATE_LED_PIN 14   // 💡 เปลี่ยนจาก SERVO มาเป็น LED จำลองไม้กั้นแทน
#define BUZZER_PIN   25   // Buzzer
#define RESET_PIN    0    // ปุ่ม BOOT

#define BUZZER_ON    LOW
#define BUZZER_OFF   HIGH

MFRC522 rfid(SS_PIN, RST_PIN);
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

// 💡 ฟังก์ชันสั่งเปิดไม้กั้น (ไฟ LED ติด)
void openGate() {
  digitalWrite(GATE_LED_PIN, HIGH);
  isGateOpen = true;
  gateOpenTime = millis();
  Serial.println("[GATE] Gate OPEN (LED ON)");
}

// 💡 ฟังก์ชันสั่งปิดไม้กั้น (ไฟ LED ดับ)
void closeGate() {
  digitalWrite(GATE_LED_PIN, LOW);
  isGateOpen = false;
  Serial.println("[GATE] Gate CLOSED (LED OFF)");
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
  Serial.println("\n[SYSTEM] Booting...");

  // ตั้งค่า Buzzer และ LED ไม้กั้น
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
  
  pinMode(GATE_LED_PIN, OUTPUT);
  digitalWrite(GATE_LED_PIN, LOW); // 💡 สั่งให้ LED ดับสนิทตอนเริ่มต้น
  
  pinMode(RESET_PIN, INPUT_PULLUP);

  // จอ LCD I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.clear();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("INIT SYSTEM...");

  // SPI Bus สำหรับ RC522
  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SS_PIN);
  rfid.PCD_Init();

  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.printf("[RFID] Version Register: 0x%x\n", version);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[ERROR] MFRC522 not found! Check wiring.");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("RFID ERROR!");
    while(1);
  }

  WiFiManager wm;

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

  beepBuzzer(1);
  lcd.clear();
  updateTopLineWelcome();
  Serial.println("[SYSTEM] Ready!");
}

// ==========================================
// 5. MAIN LOOP
// ==========================================
void loop() {
  // ตรวจจับปุ่ม Reset
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

  if (!isGateOpen) {
    if (millis() - lastClockUpdate >= 1000) {
      lastClockUpdate = millis();
      updateTopLineWelcome();
    }
    scrollSchoolText();
  }

  if (!isGateOpen && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
      cardUID += String(rfid.uid.uidByte[i], HEX);
    }
    cardUID.toUpperCase();

    Serial.println("\n[RFID] Card Scanned: " + cardUID);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("CARD: " + cardUID);
    lcd.setCursor(0, 1);
    lcd.print("CONNECTING...   ");
    delay(500);

    String role = "";
    String action = "entry";
    String authStatus = verifyCard(cardUID, role, action);
    
    Serial.println("[CLOUD] Status: " + authStatus + " | Role: " + role);

    if (authStatus == "wifi_lost" || authStatus == "error") {
       authStatus = "not_found"; 
       role = "Offline";
    }

    if (authStatus == "banned") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("CARD BANNED!    ");
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
        role = (role == "Offline") ? "Offline" : "Guest"; 
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

      openGate(); // 💡 เรียกฟังก์ชันติดไฟ LED
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ปิดไฟ LED อัตโนมัติเมื่อครบ 3 วินาที (3000 ms)
  if (isGateOpen && (millis() - gateOpenTime >= 3000)) {
    closeGate(); // 💡 เรียกฟังก์ชันดับไฟ LED
    lcd.clear();
    updateTopLineWelcome();
    scrollPos = 0;
  }
}
