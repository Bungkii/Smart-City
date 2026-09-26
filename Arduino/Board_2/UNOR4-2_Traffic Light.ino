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
#define PIR_NS    2  // PIR ฝั่งเหนือ-ใต้ (North-South)
#define PIR_EW    3  // PIR ฝั่งตะวันออก-ตก (East-West)

#define NS_RED    8  // ไฟจราจร NS
#define NS_YELLOW 9
#define NS_GREEN  10

#define EW_RED    5  // ไฟจราจร EW
#define EW_YELLOW 6
#define EW_GREEN  7

// ==============================================================================
// 3. TIMING SETTINGS (มิลลิวินาที)
// ==============================================================================
const unsigned long NORMAL_GREEN_TIME   = 4000; // ไฟเขียวรอบปกติ 4 วินาที
const unsigned long EXTENDED_GREEN_TIME = 8000; // ไฟเขียวเมื่อพบรถ 8 วินาที
const unsigned long YELLOW_TIME         = 1500; // ไฟเหลืองเตือน 1.5 วินาที

enum TrafficState {
  STATE_NS_GREEN,
  STATE_NS_YELLOW,
  STATE_EW_GREEN,
  STATE_EW_YELLOW
};

TrafficState currentState = STATE_NS_GREEN;
unsigned long lastStateTime = 0;
unsigned long currentGreenDuration = NORMAL_GREEN_TIME;
unsigned long lastTelemetryTime = 0;

// ฟังก์ชันสั่งสถานะหลอดไฟทั้ง 2 ฝั่ง
void setLights(bool nsG, bool nsY, bool nsR, bool ewG, bool ewY, bool ewR) {
  digitalWrite(NS_GREEN, nsG);
  digitalWrite(NS_YELLOW, nsY);
  digitalWrite(NS_RED, nsR);
  
  digitalWrite(EW_GREEN, ewG);
  digitalWrite(EW_YELLOW, ewY);
  digitalWrite(EW_RED, ewR);
}

// ------------------------------------------------------------------------------
// ส่งข้อมูลสถานะสัญญาณไฟจราจรทั้ง 2 ฝั่ง (NS & EW) เข้า Supabase Cloud / Dashboard
// ------------------------------------------------------------------------------
void sendTrafficTelemetry(String nsSignal, String ewSignal, String activeDirection, int waitSec, String modeType, String noteMsg) {
  if (WiFi.status() != WL_CONNECTED) return;

#if defined(ESP32)
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
    doc["system"]      = "traffic";
    doc["device_id"]   = "TR-1";
    doc["name"]        = "แยกกลางอัสสัมชัญ (Central Junction)";
    doc["location"]    = "สี่แยกสายหลัก อาคารเรียน A";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7558;
    pos["lng"] = 100.5024;

    JsonObject data = doc.createNestedObject("data_json");
    data["signal"]          = (nsSignal == "green" || ewSignal == "green") ? "green" : (nsSignal == "yellow" || ewSignal == "yellow") ? "yellow" : "red";
    data["nsSignal"]        = nsSignal;
    data["ewSignal"]        = ewSignal;
    data["activeDirection"] = activeDirection;
    data["waitSeconds"]     = waitSec;
    data["mode"]            = modeType;
    data["incident"]        = nullptr;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE TRAFFIC] Status: %d | Active: %s (NS:%s, EW:%s)\n", code, activeDirection.c_str(), nsSignal.c_str(), ewSignal.c_str());
    http.end();
  }

  // 2. ส่งเข้า Next.js Dashboard API
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
    doc["system"]      = "traffic";
    doc["deviceId"]    = "TR-1";
    doc["name"]        = "แยกกลางอัสสัมชัญ (Central Junction)";
    doc["location"]    = "สี่แยกสายหลัก อาคารเรียน A";
    doc["recordedAt"]  = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7558;
    pos["lng"] = 100.5024;

    JsonObject data = doc.createNestedObject("data");
    data["signal"]          = (nsSignal == "green" || ewSignal == "green") ? "green" : (nsSignal == "yellow" || ewSignal == "yellow") ? "yellow" : "red";
    data["nsSignal"]        = nsSignal;
    data["ewSignal"]        = ewSignal;
    data["activeDirection"] = activeDirection;
    data["waitSeconds"]     = waitSec;
    data["mode"]            = modeType;
    data["incident"]        = nullptr;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD TRAFFIC] Status: %d\n", code);
    http.end();
  }
#elif defined(ARDUINO_UNOR4_WIFI)
  // สำหรับ UNO R4 WiFi ส่งผ่าน Supabase REST API
  WiFiSSLClient sslClient;
  HttpClient http = HttpClient(sslClient, "kqkggjsjwbkodqyeddwj.supabase.co", 443);

  DynamicJsonDocument doc(512);
  doc["source"]      = "live";
  doc["system"]      = "traffic";
  doc["device_id"]   = "TR-1";
  doc["name"]        = "แยกกลางอัสสัมชัญ (Central Junction)";
  doc["location"]    = "สี่แยกสายหลัก";
  doc["recorded_at"] = "2026-09-26T12:00:00Z";
  doc["health"]      = "normal";
  doc["note"]        = noteMsg;

  JsonObject data = doc.createNestedObject("data_json");
  data["signal"]          = (nsSignal == "green" || ewSignal == "green") ? "green" : (nsSignal == "yellow" || ewSignal == "yellow") ? "yellow" : "red";
  data["nsSignal"]        = nsSignal;
  data["ewSignal"]        = ewSignal;
  data["activeDirection"] = activeDirection;
  data["waitSeconds"]     = waitSec;
  data["mode"]            = modeType;
  data["incident"]        = nullptr;

  String jsonBody;
  serializeJson(doc, jsonBody);

  http.beginRequest();
  http.post("/rest/v1/events");
  http.sendHeader("apikey", SUPABASE_KEY);
  http.sendHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Prefer", "return=minimal");
  http.sendHeader("Content-Length", jsonBody.length());
  http.beginBody();
  http.print(jsonBody);
  http.endRequest();

  int statusCode = http.responseStatusCode();
  Serial.printf("[UNO R4 SUPABASE] Status: %d | Active: %s\n", statusCode, activeDirection.c_str());
#endif
}

// ==============================================================================
// 4. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[TRAFFIC SYSTEM] Starting...");

  pinMode(PIR_NS, INPUT);
  pinMode(PIR_EW, INPUT);

  pinMode(NS_RED, OUTPUT);
  pinMode(NS_YELLOW, OUTPUT);
  pinMode(NS_GREEN, OUTPUT);

  pinMode(EW_RED, OUTPUT);
  pinMode(EW_YELLOW, OUTPUT);
  pinMode(EW_GREEN, OUTPUT);

  // เริ่มต้น: NS ไฟเขียว / EW ไฟแดง
  setLights(HIGH, LOW, LOW, LOW, LOW, HIGH);
  lastStateTime = millis();

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
    sendTrafficTelemetry("green", "red", "North-South (เหนือ-ใต้)", 30, "adaptive", "ระบบสัญญาณจราจรพร้อมทำงาน");
  } else {
    Serial.println("\n[Wi-Fi] Standalone Mode (Offline)");
  }

  Serial.println("[TRAFFIC SYSTEM] Ready!");
}

// ==============================================================================
// 5. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long currentMillis = millis();

  switch (currentState) {
    // ----------------------------------------
    // 1. ฝั่งเหนือ-ใต้ (NS) ไฟเขียว / ฝั่ง EW ไฟแดง
    // ----------------------------------------
    case STATE_NS_GREEN:
      if (digitalRead(PIR_NS) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] NS Traffic Detected -> Extend Green 8s");
        sendTrafficTelemetry("green", "red", "North-South (เหนือ-ใต้)", 45, "adaptive", "พบปริมาณรถฝั่งเหนือ-ใต้ ขยายเวลาไฟเขียว");
      }

      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_NS_YELLOW;
        setLights(LOW, HIGH, LOW, LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("yellow", "red", "North-South (เหนือ-ใต้)", 5, "adaptive", "ฝั่งเหนือ-ใต้ (NS) เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    // ----------------------------------------
    // 2. ฝั่งเหนือ-ใต้ (NS) ไฟเหลือง / ฝั่ง EW ไฟแดง
    // ----------------------------------------
    case STATE_NS_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_EW_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setLights(LOW, LOW, HIGH, HIGH, LOW, LOW);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("red", "green", "East-West (ตะวันออก-ตก)", 30, "adaptive", "สลับไฟเขียวให้ฝั่งตะวันออก-ตก (EW)");
      }
      break;

    // ----------------------------------------
    // 3. ฝั่งตะวันออก-ตก (EW) ไฟเขียว / ฝั่ง NS ไฟแดง
    // ----------------------------------------
    case STATE_EW_GREEN:
      if (digitalRead(PIR_EW) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] EW Traffic Detected -> Extend Green 8s");
        sendTrafficTelemetry("red", "green", "East-West (ตะวันออก-ตก)", 45, "adaptive", "พบปริมาณรถฝั่งตะวันออก-ตก ขยายเวลาไฟเขียว");
      }

      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_EW_YELLOW;
        setLights(LOW, LOW, HIGH, LOW, HIGH, LOW);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("red", "yellow", "East-West (ตะวันออก-ตก)", 5, "adaptive", "ฝั่งตะวันออก-ตก (EW) เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    // ----------------------------------------
    // 4. ฝั่งตะวันออก-ตก (EW) ไฟเหลือง / ฝั่ง NS ไฟแดง
    // ----------------------------------------
    case STATE_EW_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_NS_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setLights(HIGH, LOW, LOW, LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("green", "red", "North-South (เหนือ-ใต้)", 30, "adaptive", "สลับไฟเขียวให้ฝั่งเหนือ-ใต้ (NS)");
      }
      break;
  }
}
