#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <time.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "DHT.h"
#include "SmartCitySecrets.h"

// ==============================================================================
// 1. SUPABASE & CLOUD CONFIGURATION
// ==============================================================================
// ⚙️ โหมดการส่งข้อมูล: "supabase", "dashboard", หรือ "both"
const String CLOUD_MODE = "supabase"; 

// ⚙️ ตั้งค่า Supabase Project URL และ Anon Key
const String SUPABASE_URL = SMARTCITY_SUPABASE_URL;
const String SUPABASE_KEY = SMARTCITY_SUPABASE_KEY;

// ⚙️ หรือตั้งค่า URL ส่งตรงเข้า Dashboard API (/api/ingest)
const String DASHBOARD_INGEST_URL   = SMARTCITY_DASHBOARD_INGEST_URL;
const String DASHBOARD_INGEST_TOKEN = SMARTCITY_DASHBOARD_INGEST_TOKEN;

String verifiedUtcTime() {
  time_t now = time(nullptr);
  if (now < 1700000000) return "";
  struct tm utc;
  gmtime_r(&now, &utc);
  char value[25];
  strftime(value, sizeof(value), "%Y-%m-%dT%H:%M:%SZ", &utc);
  return String(value);
}

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
void sendEnvironmentTelemetry(float tempC, float humidity, bool smokeWarning, String noteMsg) {
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
    doc["name"]        = "สถานีสิ่งแวดล้อม EN-1";
    doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
    // Supabase recorded_at defaults to the database clock; this board has no verified UTC clock.
    doc["health"]      = smokeWarning ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject data = doc.createNestedObject("data_json");
    data["temperature"] = tempC;
    data["humidity"]    = humidity;
    // MQ-2 measures smoke/gas, not particulate matter. Leave PM2.5 absent.

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE ENV] Status: %d\n", code);
    http.end();
  }

  // 2. ส่งเข้า Next.js Dashboard API (/api/ingest)
  if (CLOUD_MODE == "dashboard" || CLOUD_MODE == "both") {
    String observedAt = verifiedUtcTime();
    if (observedAt.isEmpty()) return;
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
    doc["name"]        = "สถานีสิ่งแวดล้อม EN-1";
    doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
    doc["recordedAt"]  = observedAt;
    doc["health"]      = smokeWarning ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject data = doc.createNestedObject("data");
    data["temperature"] = tempC;
    data["humidity"]    = humidity;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD ENV] Status: %d\n", code);
    http.end();
  }
}

void updateOLED(float temp, float hum, int smokeRaw) {
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
  display.print("PM2.5: --");

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
  Serial.println("\n[ENV SYSTEM] Starting with WiFiManager...");

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

  WiFiManager wm;
  if (!wm.autoConnect("SmartCity-Environment-AP")) {
    ESP.restart();
  }
  configTime(0, 0, "pool.ntp.org");


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
      return;
    }

    Serial.printf("[ENV SENSE] Temp: %.1f C | Hum: %.1f %% | MQ-2 raw: %d | PM2.5 unavailable\n", temp, hum, smoke);

    updateOLED(temp, hum, smoke);

    // ส่งข้อมูลขึ้น Cloud ทุกๆ 10 วินาที
    if (now - lastCloudTime >= CLOUD_INTERVAL) {
      lastCloudTime = now;
      String note = (smoke > SMOKE_THRESHOLD) ? "MQ-2 ตรวจพบควันหรือก๊าซเกินเกณฑ์ที่ตั้งไว้" : "อ่านอุณหภูมิ ความชื้น และ MQ-2 แล้ว; ไม่มีเซ็นเซอร์ PM2.5";
      sendEnvironmentTelemetry(temp, hum, smoke > SMOKE_THRESHOLD, note);
    }
  }
}
