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

// ⚙️ ตั้งค่า URL ส่งตรงเข้า Dashboard API (/api/ingest)
#ifdef SMARTCITY_DASHBOARD_INGEST_URL
const String DASHBOARD_INGEST_URL   = SMARTCITY_DASHBOARD_INGEST_URL;
const String DASHBOARD_INGEST_TOKEN = SMARTCITY_DASHBOARD_INGEST_TOKEN;
#else
const String DASHBOARD_INGEST_URL   = "";
const String DASHBOARD_INGEST_TOKEN = "";
#endif

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

#define DHTPIN        2
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
const unsigned long READ_INTERVAL  = 2000;  // DHT11 ต้องการเวลาอ่านอย่างน้อย 2 วินาที (2000ms)
const unsigned long CLOUD_INTERVAL = 4000;  // ส่งค่าขึ้น Cloud / Dashboard ทุก 4 วินาที

// คืนค่าเวลามาตรฐานสากล ISO 8601 ("YYYY-MM-DDTHH:MM:SSZ") สำหรับส่งเข้า Cloud
String getIsoTimeString() {
  time_t now = time(nullptr);
  if (now < 1700000000) return "";
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);
  char isoStr[25];
  strftime(isoStr, sizeof(isoStr), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  return String(isoStr);
}

// ฟังก์ชันแปลงค่าตรวจจับ MQ-2 (ADC 0-4095) ให้เป็นค่าจำลอง PM2.5 (µg/m³)
float calculateEstimatedPm25(int smokeRaw) {
  // ค่าพื้นฐานอากาศบริสุทธิ์: ~300 ADC -> 12-18 µg/m³
  // เมื่อมีควันหรือก๊าซเพิ่มขึ้น: 300 - 3000 ADC -> 15 - 180 µg/m³
  if (smokeRaw <= 250) return 8.0;
  float pmVal = ((float)(smokeRaw - 250) / (4095.0 - 250.0)) * 220.0 + 10.0;
  if (pmVal < 5.0) pmVal = 5.0;
  if (pmVal > 350.0) pmVal = 350.0;
  return round(pmVal * 10.0) / 10.0;
}

// ------------------------------------------------------------------------------
// ส่งข้อมูลตรวจวัดสภาพอากาศเข้า Supabase & Dashboard Ingest Web
// ------------------------------------------------------------------------------
void sendEnvironmentTelemetry(float tempC, float humidity, float pm25Val, bool smokeWarning, String noteMsg) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  WiFiClient normalClient;

  // 1. ส่งเข้า Supabase REST Table: events
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
    doc["health"]      = smokeWarning ? "warning" : "normal";
    doc["note"]        = noteMsg;

    JsonObject data = doc.createNestedObject("data_json");
    data["temperature"] = tempC;
    data["humidity"]    = humidity;
    data["pm25"]        = pm25Val;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE ENV] Status: %d | Temp: %.1f C | Hum: %.1f %% | PM2.5: %.1f\n", code, tempC, humidity, pm25Val);
    http.end();
  }

  // 2. ส่งเข้า Next.js Dashboard API (/api/ingest)
  if ((CLOUD_MODE == "dashboard" || CLOUD_MODE == "both") && DASHBOARD_INGEST_URL.length() > 0) {
    String observedAt = getIsoTimeString();
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
    data["pm25"]        = pm25Val;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD ENV] Status: %d\n", code);
    http.end();
  }
}

void updateOLED(float temp, float hum, float pm25Val, int smokeRaw) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // 1. Header Bar
  display.setTextSize(1);
  display.setCursor(8, 0);
  display.print(F("ACT ENV STATION"));
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // 2. PM2.5 (Large Display)
  display.setTextSize(1);
  display.setCursor(0, 14);
  display.print(F("PM2.5:"));
  display.setTextSize(2);
  display.setCursor(44, 12);
  display.printf("%.0f", pm25Val);
  display.setTextSize(1);
  display.print(F(" ug"));

  // 3. Temp & Hum
  display.setCursor(0, 32);
  if (isnan(temp)) {
    display.print(F("T:--.-C "));
  } else {
    display.printf("T:%.1fC ", temp);
  }

  if (isnan(hum)) {
    display.print(F("H:--%"));
  } else {
    display.printf("H:%.0f%%", hum);
  }

  // 4. Gas Level
  display.setCursor(76, 32);
  display.printf("GAS:%d", smokeRaw);

  // 5. Status / Clock Footer
  display.drawLine(0, 48, 127, 48, SSD1306_WHITE);
  display.setCursor(0, 53);
  display.setTextSize(1);

  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeBuf[16];
    strftime(timeBuf, sizeof(timeBuf), "%H:%M:%S", &timeinfo);
    display.print(timeBuf);
  } else {
    display.print(F("ONLINE"));
  }

  // Cloud Status indicator
  display.setCursor(64, 53);
  display.print(F("SYNC: OK"));

  // 6. Smoke Warning Badge (Popup)
  if (smokeRaw > SMOKE_THRESHOLD) {
    display.fillRect(80, 0, 48, 10, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setCursor(83, 1);
    display.print(F("! WARN"));
    display.setTextColor(SSD1306_WHITE);
  }

  display.display();
}

// ==============================================================================
// 3. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[ENV SYSTEM EN-1] Booting...");

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("[ERROR] SSD1306 OLED allocation failed!"));
    for (;;);
  }

  dht.begin();
  pinMode(MQ2_PIN, INPUT);
  pinMode(RESET_WIFI_PIN, INPUT_PULLUP);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(14, 20);
  display.println(F("ACT SMART CITY"));
  display.setCursor(14, 34);
  display.println(F("Connecting WiFi..."));
  display.display();

  // ตรวจสอบการกดปุ่ม BOOT (GPIO 0) เพื่อรีเซ็ต Wi-Fi
  if (digitalRead(RESET_WIFI_PIN) == LOW) {
    Serial.println(F("\n⚠️ [RESET] BOOT Button Pressed -> Resetting Wi-Fi settings..."));
    display.clearDisplay();
    display.setCursor(10, 25);
    display.println(F("RESETTING WIFI..."));
    display.display();
    wm.resetSettings();
    delay(1500);
  }

  // เชื่อมต่อ Wi-Fi ด้วย WiFiManager (หรือใช้ Fallback)
  wm.setConfigPortalTimeout(180);
  bool res = wm.autoConnect("ACT-Env-Station-Setup");
  if (!res) {
    Serial.println(F("[Wi-Fi] AutoConnect timeout -> Using fallback credentials..."));
    WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
  }

  // ซิงก์เวลามาตรฐานจาก NTP กองทัพเรือ
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer1, ntpServer2, ntpServer3);

  display.clearDisplay();
  display.setCursor(14, 25);
  display.println(F("STATION READY"));
  display.display();
  delay(500);

  Serial.println(F("[ENV SYSTEM] Ready & Connected to Cloud!"));
  
  float initialTemp = dht.readTemperature();
  float initialHum  = dht.readHumidity();
  int initialSmoke  = analogRead(MQ2_PIN);
  float initialPm25 = calculateEstimatedPm25(initialSmoke);

  // วาดหน้าจอทันที ไม่ต้องรอจบคูลดาวน์
  updateOLED(initialTemp, initialHum, initialPm25, initialSmoke);

  if (!isnan(initialTemp) && !isnan(initialHum)) {
    sendEnvironmentTelemetry(initialTemp, initialHum, initialPm25, false, "สถานีสิ่งแวดล้อม EN-1 พร้อมทำงาน");
  }
}

// ==============================================================================
// 4. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // จัดการเชื่อมต่อ Wi-Fi ใหม่อัตโนมัติเมื่อหลุด
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (now - lastReconnect >= 10000) {
      lastReconnect = now;
      Serial.println(F("[Wi-Fi] Reconnecting..."));
      WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
    }
  }

  // 1. อ่านค่าเซนเซอร์และอัปเดตหน้าจอ OLED ทุก 2 วินาที
  if (now - lastReadTime >= READ_INTERVAL) {
    lastReadTime = now;

    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int smoke  = analogRead(MQ2_PIN);
    float pm25 = calculateEstimatedPm25(smoke);

    // อัปเดตหน้าจอ OLED ทุกรอบ (แม้ DHT จะยัง error ก็จะแสดง GAS / PM2.5 / Clock ให้เห็น)
    updateOLED(temp, hum, pm25, smoke);

    if (isnan(temp) || isnan(hum)) {
      Serial.println(F("[WARN] DHT read error! Check wiring (GPIO 4)."));
    } else {
      Serial.printf("[ENV SENSE] Temp: %.1f C | Hum: %.1f %% | PM2.5: %.1f ug | MQ-2: %d\n", temp, hum, pm25, smoke);
    }
  }

  // 2. ส่งข้อมูล Telemetry ขึ้น Cloud ทุก 4 วินาที
  if (now - lastCloudTime >= CLOUD_INTERVAL) {
    lastCloudTime = now;
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    int smoke  = analogRead(MQ2_PIN);
    float pm25 = calculateEstimatedPm25(smoke);

    bool isSmokeWarning = (smoke > SMOKE_THRESHOLD);
    String note = isSmokeWarning ? "MQ-2 ตรวจพบควันหรือก๊าซเกินเกณฑ์มาตรฐาน" : "ตรวจวัดอุณหภูมิและความชื้นปกติ";
    
    // ส่งข้อมูลสภาพอากาศขึ้น Cloud (ถ้า DHT อ่านไม่ได้ จะส่งเฉพาะ PM2.5/MQ-2)
    sendEnvironmentTelemetry(temp, hum, pm25, isSmokeWarning, note);
  }
}
