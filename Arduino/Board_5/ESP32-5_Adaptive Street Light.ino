#if defined(ESP32)
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#elif defined(ARDUINO_UNOR4_WIFI)
  #include <WiFiS3.h>
  #include <ArduinoHttpClient.h>
#else
  #include <WiFi.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#endif
#include <ArduinoJson.h>

// ==============================================================================
// 1. SUPABASE & WI-FI CONFIGURATION
// ==============================================================================
// ⚙️ Wi-Fi กลางสำหรับทั้ง 5 บอร์ด (ตั้งชื่อ Hotspot มือถือตามนี้ แล้วเปิดแชร์เน็ต บอร์ดทั้ง 5 จะติดพร้อมกันทันที)
const char* WIFI_SSID     = "ACT-SmartCity-2.4G";
const char* WIFI_PASS     = "ACT12345678";

// ⚙️ โหมดการส่งข้อมูล: "supabase", "dashboard", หรือ "both"
const String CLOUD_MODE   = "supabase"; 

// ⚙️ ตั้งค่า Supabase Project URL และ Anon Key
const String SUPABASE_URL = "https://kqkggjsjwbkodqyeddwj.supabase.co/rest/v1";
const String SUPABASE_KEY = "sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc";

// ⚙️ หรือตั้งค่า URL ส่งตรงเข้า Dashboard API (/api/ingest)
const String DASHBOARD_INGEST_URL   = "http://192.168.1.100:3000/api/ingest";
const String DASHBOARD_INGEST_TOKEN = "act_smartcity_ingest_secret_token_2026";

// ==============================================================================
// 2. PIN DEFINITIONS (UNO R4 / ESP32)
// ==============================================================================
#define LDR_PIN      A0   // อ่านค่าแสง (Analog In)
#define PIR_PIN      2    // จับการเคลื่อนไหว (Digital In)
#define LED_PWM_PIN  3    // ขาควบคุม PWM สั่งหรี่/สว่าง (PWM Pin)

// ==============================================================================
// 3. THRESHOLDS & CONFIGURATION
// ==============================================================================
const int NIGHT_THRESHOLD_ON  = 600; // แสงต่ำกว่านี้ถือว่า "เริ่มมืด" (เปิดไฟ)
const int NIGHT_THRESHOLD_OFF = 500; // แสงสูงกว่านี้ถือว่า "สว่างแล้ว" (ปิดไฟ)

// ระดับความสว่าง PWM (0 - 255)
const int BRIGHTNESS_OFF    = 0;     // ปิดไฟ (กลางวัน)
const int BRIGHTNESS_DIM    = 40;    // หรี่สแตนด์บายกลางคืน (~15%)
const int BRIGHTNESS_FULL   = 255;   // สว่างเต็ม 100% (เมื่อเจอรถ/คน)

const unsigned long HOLD_TIME      = 4000;  // ค้างไฟสว่าง 100% ไว้ 4 วินาที
const unsigned int  FADE_INTERVAL  = 8;     // ความเร็วในการ Fade
const unsigned long CLOUD_INTERVAL = 15000; // ซิงก์สถานะไฟถนนขึ้น Cloud ทุก 15 วินาที

// ==============================================================================
// 4. GLOBAL VARIABLES
// ==============================================================================
bool isNightMode = false;
int targetBrightness  = BRIGHTNESS_OFF;
int currentBrightness = BRIGHTNESS_OFF;

unsigned long lastMotionTime = 0;
unsigned long lastFadeTime   = 0;
unsigned long lastCloudTime  = 0;
int lastReportedBrightness   = -1;

// ------------------------------------------------------------------------------
// ส่งข้อมูลสถานะไฟถนนเข้า Supabase Cloud / Dashboard API
// ------------------------------------------------------------------------------
void sendStreetlightTelemetry(bool isOn, int brightnessPercent, String modeType, String noteMsg) {
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
    doc["system"]      = "streetlight";
    doc["device_id"]   = "SL-1";
    doc["name"]        = "ไฟถนนอัจฉริยะ 01 (Main Avenue Light)";
    doc["location"]    = "ถนนสายหลัก";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7562;
    pos["lng"] = 100.5035;

    JsonObject data = doc.createNestedObject("data_json");
    data["on"]         = isOn;
    data["brightness"] = brightnessPercent;
    data["mode"]       = modeType;
    data["fault"]      = nullptr;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE LIGHT] Status: %d\n", code);
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
    doc["system"]      = "streetlight";
    doc["deviceId"]    = "SL-1";
    doc["name"]        = "ไฟถนนอัจฉริยะ 01 (Main Avenue Light)";
    doc["location"]    = "ถนนสายหลัก";
    doc["recordedAt"]  = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7562;
    pos["lng"] = 100.5035;

    JsonObject data = doc.createNestedObject("data");
    data["on"]         = isOn;
    data["brightness"] = brightnessPercent;
    data["mode"]       = modeType;
    data["fault"]      = nullptr;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD LIGHT] Status: %d\n", code);
    http.end();
  }
}

// ==============================================================================
// 5. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[STREET LIGHT SYSTEM] Starting...");

  pinMode(LDR_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PWM_PIN, OUTPUT);

  analogWrite(LED_PWM_PIN, BRIGHTNESS_OFF);

  // เชื่อมต่อ Wi-Fi
  Serial.print("[Wi-Fi] Connecting to: ");
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 15) {
    delay(500);
    Serial.print(".");
    retry++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[Wi-Fi] Connected! IP: " + WiFi.localIP().toString());
    sendStreetlightTelemetry(false, 0, "auto", "ระบบไฟถนนพร้อมทำงาน");
  } else {
    Serial.println("\n[Wi-Fi] Standalone Mode (Offline)");
  }

  Serial.println("[STREET LIGHT SYSTEM] Ready & Running!");
}

// ==============================================================================
// 6. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // 1. อ่านค่าเซนเซอร์
  int ldrValue = analogRead(LDR_PIN);
  bool motionDetected = (digitalRead(PIR_PIN) == HIGH);

  // 2. ตรวจสอบสภาวะกลางวัน / กลางคืน
  if (!isNightMode && ldrValue >= NIGHT_THRESHOLD_ON) {
    isNightMode = true;
    Serial.println("[STREET LIGHT] Night Mode Activated");
  } else if (isNightMode && ldrValue < NIGHT_THRESHOLD_OFF) {
    isNightMode = false;
    Serial.println("[STREET LIGHT] Daytime Mode Activated");
  }

  // 3. กำหนดระดับความสว่างเป้าหมาย
  if (!isNightMode) {
    targetBrightness = BRIGHTNESS_OFF;
  } else {
    if (motionDetected) {
      lastMotionTime = currentMillis;
      targetBrightness = BRIGHTNESS_FULL;
    } else if (currentMillis - lastMotionTime < HOLD_TIME) {
      targetBrightness = BRIGHTNESS_FULL;
    } else {
      targetBrightness = BRIGHTNESS_DIM;
    }
  }

  // 4. Smooth Fade Engine
  if (currentMillis - lastFadeTime >= FADE_INTERVAL) {
    lastFadeTime = currentMillis;

    if (currentBrightness < targetBrightness) {
      currentBrightness++;
      analogWrite(LED_PWM_PIN, currentBrightness);
    } else if (currentBrightness > targetBrightness) {
      currentBrightness--;
      analogWrite(LED_PWM_PIN, currentBrightness);
    }
  }

  // 5. ส่งข้อมูลขึ้น Cloud เมื่อความสว่างเปลี่ยนอย่างมีนัยสำคัญ หรือทุกๆ 15 วินาที
  int currentPercent = Math.round((currentBrightness / 255.0) * 100);
  bool isOn = currentBrightness > 0;

  if (abs(currentPercent - lastReportedBrightness) >= 20 || (currentMillis - lastCloudTime >= CLOUD_INTERVAL)) {
    lastCloudTime = currentMillis;
    lastReportedBrightness = currentPercent;
    
    String note = !isOn ? "กลางวัน - ปิดไฟประหยัดพลังงาน" : 
                  (currentPercent >= 90) ? "ตรวจพบการเคลื่อนไหว - เปิดไฟสว่าง 100%" : 
                  "โหมดกลางคืน Standby - หรี่ไฟ";
                  
    sendStreetlightTelemetry(isOn, currentPercent, "auto", note);
  }
}