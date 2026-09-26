#include <WiFi.h>
#include <WiFiManager.h>
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
    doc["name"]        = "สถานีตรวจวัดคุณภาพอากาศกลาง (Central Station)";
    doc["location"]    = "ลานหน้าอาคาร A";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = pm25Est > 75.0 ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7551;
    pos["lng"] = 100.5014;

    JsonObject data = doc.createNestedObject("data_json");
    data["pm25"]        = pm25Est;
    data["temperature"] = tempC;
    data["humidity"]    = humidity;

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
    doc["name"]        = "สถานีตรวจวัดคุณภาพอากาศกลาง (Central Station)";
    doc["location"]    = "ลานหน้าอาคาร A";
    doc["recordedAt"]  = "2026-09-26T12:00:00Z";
    doc["health"]      = pm25Est > 75.0 ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7551;
    pos["lng"] = 100.5014;

    JsonObject data = doc.createNestedObject("data");
    data["pm25"]        = pm25Est;
    data["temperature"] = tempC;
    data["humidity"]    = humidity;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD ENV] Status: %d\n", code);
    http.end();
  }
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

  WiFiManager wm;
  if (!wm.autoConnect("SmartCity-Environment-AP")) {
    ESP.restart();
  }

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

    float humidity   = dht.readHumidity();
    float tempC      = dht.readTemperature();
    int smokeRaw     = analogRead(MQ2_PIN); // 0 - 4095

    if (isnan(humidity) || isnan(tempC)) {
      humidity = 60.0;
      tempC    = 29.5;
    }

    // คำนวณค่าฝุ่น PM2.5 โดยประมาณจาก Smoke Sensor
    float pm25Est = +(15.0 + (smokeRaw / 4095.0) * 80.0);

    Serial.printf("Temp: %.1f C | Humi: %.1f %% | Smoke: %d | PM2.5 Est: %.1f\n", 
                  tempC, humidity, smokeRaw, pm25Est);

    // ------------------------------------------
    // DISPLAY ON OLED
    // ------------------------------------------
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 0);
    display.print("SMART ENV STATION");
    display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

    display.setCursor(0, 16);
    display.printf("Temp : %.1f C", tempC);
    display.setCursor(0, 28);
    display.printf("Humi : %.1f %%", humidity);
    display.setCursor(0, 40);
    display.printf("PM2.5: %.1f ug/m3", pm25Est);

    display.drawLine(0, 52, 128, 52, SSD1306_WHITE);
    display.setCursor(0, 55);
    if (smokeRaw > SMOKE_THRESHOLD) {
      display.print("STATUS: SMOKE WARNING!");
    } else {
      display.print("STATUS: GOOD AIR");
    }
    display.display();

    // ส่งข้อมูลขึ้น Cloud ทุกๆ 10 วินาที หรือเมื่อพบค่าควันสูงผิดปกติ
    if (now - lastCloudTime >= CLOUD_INTERVAL || smokeRaw > SMOKE_THRESHOLD) {
      lastCloudTime = now;
      String note = (smokeRaw > SMOKE_THRESHOLD) ? "ตรวจพบควันหรือฝุ่นสูงผิดปกติ!" : "สภาพอากาศปกติ";
      sendEnvironmentTelemetry(tempC, humidity, pm25Est, note);
    }
  }
}