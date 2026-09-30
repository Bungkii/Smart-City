#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include "SmartCitySecrets.h"
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "time.h"

// ==============================================================================
// 1. SUPABASE CLOUD & TIME CONFIGURATION
// ==============================================================================
const String CLOUD_MODE   = "supabase"; 
const String SUPABASE_URL = SMARTCITY_SUPABASE_URL;
const String SUPABASE_KEY = SMARTCITY_SUPABASE_KEY;

const char* FALLBACK_SSID = SMARTCITY_WIFI_SSID;
const char* FALLBACK_PASS = SMARTCITY_WIFI_PASSWORD;

// NTP Servers กองทัพเรือ
const char* ntpServer1    = "time.navy.mi.th";
const char* ntpServer2    = "time2.navy.mi.th";
const char* ntpServer3    = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

// ==============================================================================
// 2. PIN DEFINITIONS & CONSTANTS (EXIT GATE - GT-2)
// ==============================================================================
#define SS_PIN       5    
#define RST_PIN      4    
#define SPI_SCK      18   
#define SPI_MISO     19   
#define SPI_MOSI     21

#define I2C_SDA      23
#define I2C_SCL      22

#define GATE_LED_PIN 14   // LED แสดงสถานะไม้กั้นขาออก (HIGH = เปิด, LOW = ปิด)
#define BUZZER_PIN   25   // Active Buzzer
#define RESET_PIN    0    // ปุ่ม BOOT (GPIO 0 สำหรับ Reset Wi-Fi)

#define BUZZER_ON    LOW
#define BUZZER_OFF   HIGH

MFRC522 rfid(SS_PIN, RST_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiManager wm;

unsigned long gateOpenTime   = 0;
bool isGateOpen              = false;

unsigned long lastClockUpdate = 0;
unsigned long lastScrollTime  = 0;
int scrollPos                = 0;
String schoolText            = "ACT Exit Gate (ขาออก)    ";

// ==============================================================================
// 3. HELPER FUNCTIONS
// ==============================================================================
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

// ตรวจสอบสิทธิ์การออกผ่าน Supabase Table: rfid_cards
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
  String resultStatus = "verification_failed";
  nameOut = "";
  roleOut = "";

  if (httpCode == HTTP_CODE_OK || httpCode == 200) {
    String payload = http.getString();
    DynamicJsonDocument doc(512);
    DeserializationError error = deserializeJson(doc, payload);
    if (!error && doc.is<JsonArray>()) {
      if (doc.size() == 0) resultStatus = "not_found";
      else {
        JsonObject card = doc[0];
        String status = card["status"].as<String>();
        if (status == "allow" || status == "banned") {
          resultStatus = status;
          nameOut = card["name"].as<String>();
          roleOut = card["role"].as<String>();
        }
      }
    }
  } else {
    Serial.printf("[SUPABASE CARD ERROR] HTTP Code: %d\n", httpCode);
  }
  http.end();
  return resultStatus;
}

// บันทึกประวัติการทาบบัตรขาออกลง Supabase Table: gate_logs
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
  doc["action"]     = action; // "OUT" หรือ "DENIED"

  String jsonBody;
  serializeJson(doc, jsonBody);
  int code = http.POST(jsonBody);
  Serial.printf("[SUPABASE GATE LOG - OUT] Status: %d\n", code);
  http.end();
}

// ส่งข้อมูล Telemetry ของประตูขาออก (GT-2) เข้า Supabase
void sendGateTelemetry(bool isOpen, String direction, String access, String cardRef, String note) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  HTTPClient http;
  http.begin(secureClient, SUPABASE_URL + "/events");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "return=minimal");

  DynamicJsonDocument doc(512);
  doc["source"]      = "live";
  doc["system"]      = "gate";
  doc["device_id"]   = "GT-2";
  doc["name"]        = "เครื่องอ่าน RFID ขาออก GT-2";
  doc["location"]    = "ประตูทางออก";
  doc["health"]      = "normal";
  doc["note"]        = note;

  JsonObject data = doc.createNestedObject("data_json");
  data["open"] = isOpen;
  if (isOpen) {
    data["direction"] = direction; // "out"
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
  Serial.printf("[SUPABASE GATE TELEMETRY - GT-2] Status: %d\n", code);
  http.end();
}

void openGate(String cardUID, String role, String accessStatus) {
  digitalWrite(GATE_LED_PIN, HIGH);
  isGateOpen = true;
  gateOpenTime = millis();
  Serial.println("[GATE OUT] Gate OPEN (LED ON)");
  
  sendGateTelemetry(true, "out", accessStatus, cardUID, "ทาบบัตรเปิดประตูขาออก: " + role);
}

void closeGate() {
  digitalWrite(GATE_LED_PIN, LOW);
  isGateOpen = false;
  Serial.println("[GATE OUT] Gate CLOSED (LED OFF)");

  sendGateTelemetry(false, "out", "granted", "", "ประตูขาออกปิดอัตโนมัติ");
}

void updateTopLineWelcome() {
  String currentTime = getLocalTimeString();
  lcd.setCursor(0, 0);
  String topLine = "Exit Gate " + currentTime;
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
// 4. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[EXIT GATE SYSTEM GT-2] Starting...");

  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, BUZZER_OFF);
  
  pinMode(GATE_LED_PIN, OUTPUT);
  digitalWrite(GATE_LED_PIN, LOW);
  
  pinMode(RESET_PIN, INPUT_PULLUP);

  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.clear();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("INIT EXIT GATE..");

  SPI.begin(SPI_SCK, SPI_MISO, SPI_MOSI, SS_PIN);
  rfid.PCD_Init();

  byte version = rfid.PCD_ReadRegister(rfid.VersionReg);
  Serial.printf("[RFID] Version Register: 0x%x\n", version);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[ERROR] MFRC522 not found!");
    lcd.clear();
    lcd.setCursor(0,0);
    lcd.print("RFID ERROR!");
    while(1);
  }

  // Reset Wi-Fi ตอนเปิดเครื่องถ้ากดปุ่ม BOOT ค้าง
  if (digitalRead(RESET_PIN) == LOW) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("RESETTING WIFI..");
    wm.resetSettings();
    beepBuzzer(2);
    delay(1500);
  }

  wm.setConfigPortalTimeout(180);
  bool res = wm.autoConnect("ACT-Exit-Gate-Setup");
  if (!res) {
    Serial.println("[Wi-Fi] AutoConnect failed -> Trying fallback credentials...");
    WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
  }

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer1, ntpServer2, ntpServer3);

  beepBuzzer(1);
  lcd.clear();
  updateTopLineWelcome();
  sendGateTelemetry(false, "out", "granted", "", "ระบบประตูขาออกออนไลน์พร้อมทำงาน");
  Serial.println("[EXIT GATE SYSTEM] Ready & Connected!");
}

// ==============================================================================
// 5. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // Auto Reconnect Wi-Fi
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect >= 10000) {
      lastReconnect = now;
      Serial.println("[Wi-Fi] Reconnecting...");
      WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
    }
  }

  // Reset Button
  if (digitalRead(RESET_PIN) == LOW) {
    delay(100);
    if (digitalRead(RESET_PIN) == LOW) {
      unsigned long btnPressTime = millis();
      while (digitalRead(RESET_PIN) == LOW) {
        if (millis() - btnPressTime >= 2000) {
          wm.resetSettings();
          beepBuzzer(2);
          delay(1000);
          ESP.restart();
        }
      }
    }
  }

  if (!isGateOpen) {
    if (now - lastClockUpdate >= 1000) {
      lastClockUpdate = now;
      updateTopLineWelcome();
    }
    scrollSchoolText();
  }

  // ตรวจจับการแตะบัตร RFID ขาออก
  if (!isGateOpen && rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
    String cardUID = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
      if (rfid.uid.uidByte[i] < 0x10) cardUID += "0";
      cardUID += String(rfid.uid.uidByte[i], HEX);
    }
    cardUID.toUpperCase();

    Serial.println("\n[RFID EXIT] Card Scanned: " + cardUID);

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("EXIT: " + cardUID);
    lcd.setCursor(0, 1);
    lcd.print("CHECKING ACCESS.");
    delay(200);

    String cardName = "";
    String cardRole = "";
    String authStatus = verifyCardWithSupabase(cardUID, cardName, cardRole);
    
    Serial.println("[SUPABASE EXIT] Verification status: " + authStatus);

    if (authStatus == "wifi_lost" || authStatus == "verification_failed") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print(authStatus == "wifi_lost" ? "NETWORK OFFLINE  " : "VERIFY ERROR     ");
      lcd.setCursor(0, 1);
      lcd.print("ACCESS DENIED   ");
      beepBuzzer(3);
      delay(2500);
      lcd.clear();
      updateTopLineWelcome();
    }
    else if (authStatus == "banned") {
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("CARD BANNED!    ");
      lcd.setCursor(0, 1);
      lcd.print(cardRole.length() > 0 ? cardRole : cardUID);
      beepBuzzer(3);

      logGateAccessToSupabase(cardUID, cardName, cardRole, "banned", "DENIED");
      sendGateTelemetry(false, "out", "denied", cardUID, "ปฏิเสธการออก: บัตรถูกระงับ (" + cardUID + ")");
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

      logGateAccessToSupabase(cardUID, cardName, cardRole, "allow", "OUT");
      openGate(cardUID, cardRole, "granted");
    } 
    else { // not_found
      beepBuzzer(2);
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("NOT REGISTERED  ");
      lcd.setCursor(0, 1);
      lcd.print("ID: " + cardUID);

      logGateAccessToSupabase(cardUID, "Unregistered", "Guest", "not_found", "DENIED");
      sendGateTelemetry(false, "out", "denied", cardUID, "ไม่พบข้อมูลบัตรขาออก (" + cardUID + ")");
      delay(2500);
      lcd.clear();
      updateTopLineWelcome();
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
  }

  // ปิดไม้กั้นอัตโนมัติเมื่อครบ 3 วินาที
  if (isGateOpen && (now - gateOpenTime >= 3000)) {
    closeGate();
    lcd.clear();
    updateTopLineWelcome();
    scrollPos = 0;
  }
}
