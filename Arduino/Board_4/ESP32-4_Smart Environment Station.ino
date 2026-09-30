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
const String CLOUD_MODE   = "supabase"; 
const String SUPABASE_URL = SMARTCITY_SUPABASE_URL;
const String SUPABASE_KEY = SMARTCITY_SUPABASE_KEY;

const char* FALLBACK_SSID = SMARTCITY_WIFI_SSID;
const char* FALLBACK_PASS = SMARTCITY_WIFI_PASSWORD;

const char* ntpServer1    = "time.navy.mi.th";
const char* ntpServer2    = "time2.navy.mi.th";
const char* ntpServer3    = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7
const int   daylightOffset_sec = 0;

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
#define RESET_WIFI_PIN 0 // ปุ่ม BOOT สำหรับ Reset Wi-Fi

// ค่าความเข้มข้นควันสำหรับเตือนภัย (ESP32 ADC 12-bit: 0 - 4095)
const int SMOKE_THRESHOLD = 1200; 

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHT dht(DHTPIN, DHTTYPE);
WiFiManager wm;

unsigned long lastReadTime  = 0;
unsigned long lastCloudTime = 0;
const unsigned long READ_INTERVAL  = 2000;  // อ่านค่าเซนเซอร์ทุก 2 วินาที
const unsigned long CLOUD_INTERVAL = 10000; // ส่งค่าขึ้น Cloud ทุก 10 วินาที

// ------------------------------------------------------------------------------
// ส่งข้อมูลตรวจวัดสภาพอากาศเข้า Supabase
// ------------------------------------------------------------------------------
void sendEnvironmentTelemetry(float tempC, float humidity, bool smokeWarning, String noteMsg) {
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
  doc["system"]      = "environment";
  doc["device_id"]   = "EN-1";
  doc["name"]        = "สถานีสิ่งแวดล้อม EN-1";
  doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
  doc["health"]      = smokeWarning ? "warning" : "normal";
  doc["note"]        = noteMsg;

  JsonObject data = doc.createNestedObject("data_json");
  data["temperature"] = tempC;
  data["humidity"]    = humidity;

  String jsonBody;
  serializeJson(doc, jsonBody);
  int code = http.POST(jsonBody);
  Serial.printf("[SUPABASE ENV] Status: %d | Temp: %.1f | Hum: %.1f\n", code, tempC, humidity);
  http.end();
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

  // Smoke & Time
  display.setCursor(0, 40);
  display.printf("Smoke: %d", smokeRaw);

  struct tm timeinfo;
  display.setCursor(0, 52);
  if (getLocalTime(&timeinfo)) {
    char timeBuf[24];
    strftime(timeBuf, sizeof(timeBuf), "%H:%M:%S", &timeinfo);
    display.print(timeBuf);
  } else {
    display.print("WiFi Online");
  }

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
  pinMode(RESET_WIFI_PIN, INPUT_PULLUP);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 25);
  display.println(F("CONNECTING WIFI..."));
  display.display();

  // ตรวจสอบการกดปุ่ม Reset Wi-Fi ตอนเปิดเครื่อง
  if (digitalRead(RESET_WIFI_PIN) == LOW) {
    Serial.println("\n⚠️ [RESET] Detected Reset Button Pressed -> Resetting Wi-Fi settings...");
    wm.resetSettings();
    delay(1000);
  }

  // เชื่อมต่อ Wi-Fi (ตั้งค่าผ่าน Portal หรือใช้รหัสจาก SmartCitySecrets.h)
  wm.setConfigPortalTimeout(180);
  bool res = wm.autoConnect("ACT-Env-Station-Setup");
  if (!res) {
    Serial.println("[Wi-Fi] AutoConnect failed -> Trying fallback credentials...");
    WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
  }

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer1, ntpServer2, ntpServer3);

  display.clearDisplay();
  display.setCursor(10, 25);
  display.println(F("AIR MONITOR READY"));
  display.display();
  delay(1000);

  Serial.println("[ENV SYSTEM] Ready & Connected to Cloud!");
  
  float initialTemp = dht.readTemperature();
  float initialHum  = dht.readHumidity();
  if (!isnan(initialTemp) && !isnan(initialHum)) {
    sendEnvironmentTelemetry(initialTemp, initialHum, false, "สถานีสิ่งแวดล้อมพร้อมทำงาน");
  }
}

// ==============================================================================
// 4. MAIN LOOP
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

  // อ่านค่าจากเซนเซอร์ทุก 2 วินาที
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int smoke  = analogRead(MQ2_PIN);

    if (isnan(temp) || isnan(hum)) {
      Serial.println("[ERROR] Failed to read from DHT sensor!");
      return;
    }

    Serial.printf("[ENV SENSE] Temp: %.1f C | Hum: %.1f %% | MQ-2 raw: %d\n", temp, hum, smoke);
    updateOLED(temp, hum, smoke);

    // ส่งข้อมูลขึ้น Cloud ทุกๆ 10 วินาที
    if (now - lastCloudTime >= CLOUD_INTERVAL) {
      lastCloudTime = now;
      String note = (smoke > SMOKE_THRESHOLD) ? "MQ-2 ตรวจพบควันหรือก๊าซเกินเกณฑ์" : "ตรวจวัดอุณหภูมิและความชื้นปกติ";
      sendEnvironmentTelemetry(temp, hum, smoke > SMOKE_THRESHOLD, note);
    }
  }
}

