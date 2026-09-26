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

// ==============================================================================
// 1. SUPABASE CLOUD CONFIGURATION (บันทึกและจำการตั้งค่าลง SQL)
// ==============================================================================
// ⚙️ โหมดการส่งข้อมูล: "supabase", "dashboard", หรือ "both"
const String CLOUD_MODE = "supabase"; 

// ⚙️ ตั้งค่า Supabase Project URL และ Anon Key
const String SUPABASE_URL = "https://kqkggjsjwbkodqyeddwj.supabase.co/rest/v1";
const String SUPABASE_KEY = "sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc";

// ⚙️ ตั้งค่า URL ส่งตรงเข้า Dashboard API (/api/ingest)
const String DASHBOARD_INGEST_URL   = "http://192.168.1.100:3000/api/ingest";
const String DASHBOARD_INGEST_TOKEN = "act_smartcity_ingest_secret_token_2026";

// NTP Server สำหรับเวลามาตรฐาน
const char* ntpServer     = "time1.nimt.or.th";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

// ==============================================================================
// 2. PIN DEFINITIONS & CONSTANTS
// ==============================================================================
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
#define GATE_LED_PIN 14   // LED จำลองสถานะไม้กั้น (HIGH = เปิด, LOW = ปิด)
#define BUZZER_PIN   25   // Active Buzzer
#define RESET_PIN    0    // ปุ่ม BOOT (GPIO 0 สำหรับ Reset Wi-Fi)

#define BUZZER_ON    LOW
#define BUZZER_OFF   HIGH

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);

unsigned long gateOpenTime   = 0;
bool isGateOpen              = false;

unsigned long lastClockUpdate = 0;
unsigned long lastScrollTime  = 0;
int scrollPos                = 0;
String schoolText            = "Assumption College Thonburi    ";

// ==============================================================================
// 3. HELPER FUNCTIONS & TIME FORMATTING
// ==============================================================================

// คืนค่าเวลาในรูปแบบ "HH:MM:SS" สำหรับหน้าจอ LCD
String getLocalTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "--:--:--";
  }
  char timeStr[9];
  strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
  return String(timeStr);
}

// คืนค่าเวลามาตรฐานสากล ISO 8601 ("YYYY-MM-DDTHH:MM:SSZ") สำหรับส่งเข้า Cloud
String getIsoTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "2026-09-26T12:00:00Z";
  }
  char isoStr[25];
  strftime(isoStr, sizeof(isoStr), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(isoStr);
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

// ------------------------------------------------------------------------------
// 4. บันทึกและจำค่า Wi-Fi ที่ตั้งค่าผ่าน WiFiManager ลง Supabase SQL (ตาราง settings)
// ------------------------------------------------------------------------------
void syncWiFiConfigToSupabase(String ssid, String pass) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  HTTPClient http;
  http.begin(secureClient, SUPABASE_URL + "/settings");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  // 1. บันทึก wifi_ssid ลง SQL
  String bodySsid = "{\"key\":\"wifi_ssid\",\"value\":\"" + ssid + "\",\"updated_at\":\"" + getIsoTimeString() + "\"}";
  int code1 = http.POST(bodySsid);

  // 2. บันทึก wifi_pass ลง SQL
  if (pass.length() > 0) {
    String bodyPass = "{\"key\":\"wifi_pass\",\"value\":\"" + pass + "\",\"updated_at\":\"" + getIsoTimeString() + "\"}";
    http.POST(bodyPass);
  }
  
  http.end();
  Serial.printf("[SUPABASE SQL] Synced Wi-Fi '%s' to settings table (HTTP: %d)\n", ssid.c_str(), code1);
}

// ------------------------------------------------------------------------------
// 5. SUPABASE ACCESS CONTROL (แทนที่ Google Sheets Data & Logs)
// ------------------------------------------------------------------------------

// ตรวจสอบสิทธิ์การเข้าผ่าน Supabase REST Table: rfid_cards
String verifyCardWithSupabase(String cardUID, String &nameOut, String &roleOut) {
  if (WiFi.status() != WL_CONNECTED) return "wifi_lost";

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  HTTPClient http;
  String url = SUPABASE_URL + "/rfid_cards?card_id=eq." + cardUID + "&select=*";
  http.begin(secureClient, url);
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);

  int httpCode = http.GET();
  String resultStatus = "not_found";
  nameOut = "Unregistered";
  roleOut = "Guest";

  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    String payload = http.getString();
    Serial.println("[SUPABASE CARD QUERY] " + payload);

    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, payload);
    if (!error && doc.is<JsonArray>() && doc.size() > 0) {
      JsonObject card = doc[0];
      resultStatus = card["status"].as<String>(); // "allow" หรือ "banned"
      nameOut      = card["name"].as<String>();
      roleOut      = card["role"].as<String>();
    }
  } else {
    Serial.printf("[SUPABASE CARD ERROR] HTTP Code: %d\n", httpCode);
  }
  http.end();
  return resultStatus;
}

// บันทึกประวัติการทาบบัตรลง Supabase Table: gate_logs
void logGateAccessToSupabase(String cardUID, String name, String role, String status, String action) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  HTTPClient http;
  http.begin(secureClient, SUPABASE_URL + "/gate_logs");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  DynamicJsonDocument doc(256);
  doc["card_id"]    = cardUID;
  doc["name"]       = name;
  doc["role"]       = role;
  doc["status"]     = status;
  doc["action"]     = action;
  doc["scanned_at"] = getIsoTimeString();

  String jsonBody;
  serializeJson(doc, jsonBody);
  int code = http.POST(jsonBody);
  Serial.printf("[SUPABASE GATE LOG] Status: %d\n", code);
  http.end();
}

// ------------------------------------------------------------------------------
// 6. ส่งข้อมูล Telemetry เข้าสู่ Supabase / Dashboard API
// ------------------------------------------------------------------------------
void sendGateTelemetry(bool isOpen, String direction, String access, String cardRef, String note) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  WiFiClient normalClient;

  // 1. ส่งเข้า Supabase REST API (ตาราง events)
  if (CLOUD_MODE == "supabase" || CLOUD_MODE == "both") {
    HTTPClient http;
    http.begin(secureClient, SUPABASE_URL + "/events");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    DynamicJsonDocument doc(512);
    doc["source"]      = "live";
    doc["system"]      = "gate";
    doc["device_id"]   = "GT-1";
    doc["name"]        = "ประตูทางเข้าหลัก (Main Gate)";
    doc["location"]    = "อาคารเซนต์คาเบรียล";
    doc["recorded_at"] = getIsoTimeString();
    doc["health"]      = "normal";
    doc["note"]        = note;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7574;
    pos["lng"] = 100.5029;

    JsonObject data = doc.createNestedObject("data_json");
    data["open"] = isOpen;
    if (isOpen) {
      data["direction"] = direction;
      data["access"]    = access;
      data["cardRef"]   = cardRef;
    } else {
      data["direction"] = nullptr;
      data["access"]    = nullptr;
      data["cardRef"]   = nullptr;
    }

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE GATE] Status: %d\n", code);
    http.end();
  }

  // 2. ส่งเข้า Next.js Dashboard API (/api/ingest)
  if (CLOUD_MODE == "dashboard" || CLOUD_MODE == "both") {
    HTTPClient http;
    if (DASHBOARD_INGEST_URL.startsWith("https")) {
      http.begin(secureClient, DASHBOARD_INGEST_URL);
    } else {
      http.begin(normalClient, DASHBOARD_INGEST_URL);
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + DASHBOARD_INGEST_TOKEN);

    DynamicJsonDocument doc(512);
    doc["system"]      = "gate";
    doc["deviceId"]    = "GT-1";
    doc["name"]        = "ประตูทางเข้าหลัก (Main Gate)";
    doc["location"]    = "อาคารเซนต์คาเบรียล";
    doc["recordedAt"]  = getIsoTimeString();
    doc["health"]      = "normal";
    doc["note"]        = note;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7574;
    pos["lng"] = 100.5029;

    JsonObject data = doc.createNestedObject("data");
    data["open"] = isOpen;
    if (isOpen) {
      data["direction"] = direction;
      data["access"]    = access;
      data["cardRef"]   = cardRef;
    } else {
      data["direction"] = nullptr;
      data["access"]    = nullptr;
      data["cardRef"]   = nullptr;
    }

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD GATE] Status: %d\n", code);
    http.end();
  }
}

// ฟังก์ชันสั่งเปิดไม้กั้น
void openGate(String cardUID, String role, String accessStatus) {
  digitalWrite(GATE_LED_PIN, HIGH);
  isGateOpen = true;
  gateOpenTime = millis();
  Serial.println("[GATE] Gate OPEN (LED ON)");
  
  // ซิงก์ข้อมูลขึ้น Cloud
  sendGateTelemetry(true, "in", accessStatus, cardUID, "ทาบบัตรเปิดประตู: " + role);
}

// ฟังก์ชันสั่งปิดไม้กั้น
void closeGate() {
  digitalWrite(GATE_LED_PIN, LOW);
  isGateOpen = false;
  Serial.println("[GATE] Gate CLOSED (LED OFF)");

  // ซิงก์สถานะปิดเข้า Cloud
  sendGateTelemetry(false, "in", "granted", "", "ประตูปิดอัตโนมัติ");
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

// ==============================================================================
// 7. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[GATE SYSTEM] Booting with WiFiManager & Supabase SQL...");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
  
  pinMode(GATE_LED_PIN, OUTPUT);
  digitalWrite(GATE_LED_PIN, LOW);
  
  pinMode(RESET_PIN, INPUT_PULLUP);

  // จอ LCD I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.clear();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("INIT SUPABASE...");

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

  // ตรวจจับการกดปุ่ม BOOT เพื่อ Reset Wi-Fi ตอนเปิดเครื่อง
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

  // เปิด Captive Portal AP หากยังไม่มีการตั้งค่า
  if (!wm.autoConnect("SmartCity-Gate-AP")) {
    ESP.restart();
  }

  // เมื่อเชื่อมต่อ Wi-Fi สำเร็จ -> บันทึกและจำค่าลง Supabase SQL (ตาราง settings) อัตโนมัติ
  syncWiFiConfigToSupabase(WiFi.SSID(), WiFi.psk());

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
  Serial.println("[GATE SYSTEM] Ready & Connected to Supabase Cloud!");
}

// ==============================================================================
// 8. MAIN LOOP
// ==============================================================================
void loop() {
  // ตรวจจับปุ่ม Reset Wi-Fi (กดค้าง 2 วินาทีเพื่อเปิดหน้า Portal ใหม่)
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

  // ตรวจจับการแตะบัตร RFID
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
    lcd.print("SUPABASE CHECK..");
    delay(200);

    String cardName = "";
    String cardRole = "";
    String authStatus = verifyCardWithSupabase(cardUID, cardName, cardRole);
    
    Serial.println("[SUPABASE] Status: " + authStatus + " | Name: " + cardName + " | Role: " + cardRole);

    if (authStatus == "wifi_lost") {
       authStatus = "allow"; 
       cardRole = "Offline Pass";
       cardName = "Guest";
    }

    if (authStatus == "banned") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("CARD BANNED!    ");
      lcd.setCursor(0, 1);
      lcd.print(cardRole.length() > 0 ? cardRole : cardUID);
      beepBuzzer(3);

      // บันทึก Log การถูกปฏิเสธลง Supabase
      logGateAccessToSupabase(cardUID, cardName, cardRole, "banned", "DENIED");
      sendGateTelemetry(false, "in", "denied", cardUID, "ปฏิเสธการเข้า: บัตรถูกระงับ (" + cardUID + ")");
      delay(3000); 
      lcd.clear();
      updateTopLineWelcome();
    } 
    else if (authStatus == "allow") {
      beepBuzzer(1); 
      lcd.clear();
      updateTopLineWelcome();

      String displayLine = cardUID + " " + cardRole;
      while (displayLine.length() < 16) displayLine += " ";
      if (displayLine.length() > 16) displayLine = displayLine.substring(0, 16);

      lcd.setCursor(0, 1);
      lcd.print(displayLine);

      // บันทึก Log การเข้าผ่านลง Supabase gate_logs
      logGateAccessToSupabase(cardUID, cardName, cardRole, "allow", "IN");
      openGate(cardUID, cardRole, "granted");
    } 
    else { // not_found หรือบัตรยังไม่ได้ลงทะเบียน
      beepBuzzer(2);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("NOT REGISTERED  ");
      lcd.setCursor(0, 1);
      lcd.print("ID: " + cardUID);

      // บันทึก Log บัตรที่ไม่ลงทะเบียนลง Supabase
      logGateAccessToSupabase(cardUID, "Unregistered", "Guest", "not_found", "DENIED");
      sendGateTelemetry(false, "in", "denied", cardUID, "ไม่พบข้อมูลบัตรในระบบ (" + cardUID + ")");
      delay(2500);
      lcd.clear();
      updateTopLineWelcome();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ปิดไฟ LED ไม้กั้นอัตโนมัติเมื่อครบ 3 วินาที
  if (isGateOpen && (millis() - gateOpenTime >= 3000)) {
    closeGate();
    lcd.clear();
    updateTopLineWelcome();
    scrollPos = 0;
  }
}
