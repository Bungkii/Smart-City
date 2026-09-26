#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"

// ==============================================================================
// 1. SUPABASE & CLOUD CONFIGURATION
// ==============================================================================
// ⚙️ Wi-Fi กลางสำหรับทั้ง 5 บอร์ด
const char* WIFI_SSID     = "ACT-SmartCity-2.4G";
const char* WIFI_PASS     = "ACT12345678";

// ⚙️ โหมดการส่งข้อมูล: "supabase", "dashboard", หรือ "both"
const String CLOUD_MODE = "supabase"; 

// ⚙️ ตั้งค่า Supabase Project URL และ Anon Key
const String SUPABASE_URL = "https://kqkggjsjwbkodqyeddwj.supabase.co/rest/v1";
const String SUPABASE_KEY = "sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc";

// ⚙️ หรือตั้งค่า URL ส่งตรงเข้า Dashboard API (/api/ingest)
const String DASHBOARD_INGEST_URL   = "http://192.168.1.100:3000/api/ingest";
const String DASHBOARD_INGEST_TOKEN = "act_smartcity_ingest_secret_token_2026";

// ==============================================================================
// 2. CONFIGURATION & PINS
// ==============================================================================
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

#define I2C_SDA       21
#define I2C_SCL       22

#define DHTPIN        4
#define DHTTYPE       DHT11
#define MQ2_PIN       34

// ค่าความเข้มข้นควันสำหรับเตือนภัย (ESP32 ADC 12-bit: 0 - 4095)
const int SMOKE_THRESHOLD = 1200; 

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(DHTPIN, DHTTYPE);

unsigned long lastReadTime  = 0;
unsigned long lastCloudTime = 0;
const unsigned long READ_INTERVAL  = 2000;  // อ่านค่าเซนเซอร์ทุก 2 วินาที
const unsigned long CLOUD_INTERVAL = 10000; // ส่งค่าขึ้น Cloud ทุก 10 วินาที

// ------------------------------------------------------------------------------
// ส่งข้อมูลตรวจวัดสภาพอากาศเข้า Supabase / Dashboard API
// ------------------------------------------------------------------------------
void sendEnvironmentTelemetry(float tempC, float humidity, float pm25Est, String noteMsg) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  WiFiClient normalClient;

  // 1. ส่งเข้า Supabase REST API
  if (CLOUD_MODE == "supabase" || CLOUD_MODE == "both") {
    HTTPClient http;
    http.begin(secureClient, SUPABASE_URL + "/events");
    http.addHeader("apikey", SUPABASE_KEY);
    http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Prefer", "return=minimal");

    DynamicJsonDocument doc(512);
    doc["source"]      = "live";
    doc["system"]      = "environment";
    doc["device_id"]   = "EN-1";
    doc["name"]        = "สถานีวัดสภาพอากาศ (Station Central)";
    doc["location"]    = "ลานอเนกประสงค์กลางแจ้ง";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = (pm25Est > 75.0) ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7551;
    pos["lng"] = 100.5014;

    JsonObject data = doc.createNestedObject("data_json");
    data["temperature"] = tempC;
    data["humidity"]    = humidity;
    data["pm25"]        = pm25Est;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE ENV] Status: %d\n", code);
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
    doc["system"]      = "environment";
    doc["deviceId"]    = "EN-1";
    doc["name"]        = "สถานีวัดสภาพอากาศ (Station Central)";
    doc["location"]    = "ลานอเนกประสงค์กลางแจ้ง";
    doc["recordedAt"]  = "2026-09-26T12:00:00Z";
    doc["health"]      = (pm25Est > 75.0) ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7551;
    pos["lng"] = 100.5014;

    JsonObject data = doc.createNestedObject("data");
    data["temperature"] = tempC;
    data["humidity"]    = humidity;
    data["pm25"]        = pm25Est;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD ENV] Status: %d\n", code);
    http.end();
  }
}

void updateOLED(float temp, float hum, int smokeRaw, float pm25) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Header
  display.setTextSize(1);
  display.setCursor(12, 0);
  display.println(F("ACT ENV MONITOR"));
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Temperature & Humidity
  display.setCursor(0, 16);
  display.printf("Temp: %.1f C", temp);

  display.setCursor(0, 28);
  display.printf("Hum:  %.1f %%", hum);

  // Smoke & PM2.5
  display.setCursor(0, 40);
  display.printf("Smoke: %d", smokeRaw);

  display.setCursor(0, 52);
  display.printf("PM2.5: %.1f ug", pm25);

  if (smokeRaw > SMOKE_THRESHOLD) {
    display.fillRect(80, 48, 48, 16, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setCursor(84, 52);
    display.print(F("WARN!"));
    display.setTextColor(SSD1306_WHITE);
  }

  display.display();
}

// ==============================================================================
// 3. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[ENV SYSTEM] Starting...");

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  dht.begin();
  pinMode(MQ2_PIN, INPUT);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println(F("CONNECTING WIFI..."));
  display.display();

  // เชื่อมต่อ Wi-Fi โดยตรง
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.printf("[ENV] Connecting to WiFi '%s'...\n", WIFI_SSID);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[ENV] WiFi Connected! IP: " + WiFi.localIP().toString());

  display.clearDisplay();
  display.setCursor(10, 25);
  display.println(F("AIR MONITOR READY"));
  display.display();
  delay(1000);

  Serial.println("[ENV SYSTEM] Ready & Connected to Cloud!");
}

// ==============================================================================
// 4. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // อ่านค่าจากเซนเซอร์ทุก 2 วินาที
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int smoke  = analogRead(MQ2_PIN);

    // ตรวจสอบค่าที่อ่านได้
    if (isnan(temp) || isnan(hum)) {
      Serial.println("[ERROR] Failed to read from DHT sensor!");
      temp = 30.0;
      hum  = 65.0;
    }

    // คำนวณค่าประมาณ PM2.5 จากระดับควันและสภาพอากาศ (ug/m3)
    float pm25Est = (smoke / 4095.0) * 120.0 + (hum * 0.1);

    Serial.printf("[ENV SENSE] Temp: %.1f C | Hum: %.1f %% | Smoke: %d | PM2.5: %.1f ug/m3\n", 
                  temp, hum, smoke, pm25Est);

    updateOLED(temp, hum, smoke, pm25Est);

    // ส่งข้อมูลขึ้น Cloud ทุกๆ 10 วินาที
    if (now - lastCloudTime >= CLOUD_INTERVAL) {
      lastCloudTime = now;
      String note = (smoke > SMOKE_THRESHOLD) ? "ตรวจพบควันหรือก๊าซเกินเกณฑ์มาตรฐาน!" : "คุณภาพอากาศปกติ";
      sendEnvironmentTelemetry(temp, hum, pm25Est, note);
    }
  }
}