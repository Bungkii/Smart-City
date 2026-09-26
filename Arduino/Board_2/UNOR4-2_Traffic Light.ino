#if defined(ESP32)
  #include <WiFi.h>
  #include <WiFiManager.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#elif defined(ARDUINO_UNOR4_WIFI)
  #include <WiFiS3.h>
  #include <ArduinoHttpClient.h>
#else
  #include <WiFi.h>
  #include <WiFiManager.h>
  #include <HTTPClient.h>
  #include <WiFiClientSecure.h>
#endif
#include <ArduinoJson.h>

// ==============================================================================
// 1. SUPABASE & WI-FI CONFIGURATION
// ==============================================================================
const String CLOUD_MODE   = "supabase"; 
const String SUPABASE_URL = "https://kqkggjsjwbkodqyeddwj.supabase.co/rest/v1";
const String SUPABASE_KEY = "sb_publishable_lszD_-UWYQ6hhL9cvEyCIA_c3ZHXSCc";
const char* FALLBACK_SSID = "ACT-SmartCity-2.4G";
const char* FALLBACK_PASS = "ACT12345678";

// ==============================================================================
// 2. PIN DEFINITIONS (4-WAY INTERSECTION)
// ==============================================================================
#define TRIG_PIN  2   
#define ECHO_N    3   
#define ECHO_S    A4  

#define PIR_E     A3  
#define PIR_W     13  

#define N_RED 4  
#define N_YEL 5  
#define N_GRN 6

#define E_RED 7  
#define E_YEL 8  
#define E_GRN 9

#define S_RED 10 
#define S_YEL 11 
#define S_GRN 12

#define W_RED A0 
#define W_YEL A1 
#define W_GRN A2

#define RESET_WIFI_PIN 0 // ปุ่ม BOOT (GPIO 0) สำหรับล้าง Wi-Fi

// ==============================================================================
// 3. TIMING & STATE MACHINE
// ==============================================================================
const float DETECT_DIST_CM      = 8.0;   
const unsigned long NORMAL_GREEN_TIME   = 4000; 
const unsigned long EXTENDED_GREEN_TIME = 8000; 
const unsigned long YELLOW_TIME         = 1500; 

enum TrafficState {
  STATE_N_GREEN, STATE_N_YELLOW,
  STATE_E_GREEN, STATE_E_YELLOW,
  STATE_S_GREEN, STATE_S_YELLOW,
  STATE_W_GREEN, STATE_W_YELLOW
};

TrafficState currentState = STATE_N_GREEN;
unsigned long lastStateTime = 0;
unsigned long currentGreenDuration = NORMAL_GREEN_TIME;

#if defined(ESP32)
WiFiManager wm;
#endif

// ==============================================================================
// 4. HELPER FUNCTIONS
// ==============================================================================
float getDistance(int echoPin) {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(echoPin, HIGH, 6000);
  if (duration == 0) return 999.0;
  return (float)duration * 0.0343 / 2.0;
}

void setAllLights(bool nG, bool nY, bool nR,
                 bool eG, bool eY, bool eR,
                 bool sG, bool sY, bool sR,
                 bool wG, bool wY, bool wR) {
  digitalWrite(N_GRN, nG); digitalWrite(N_YEL, nY); digitalWrite(N_RED, nR);
  digitalWrite(E_GRN, eG); digitalWrite(E_YEL, eY); digitalWrite(E_RED, eR);
  digitalWrite(S_GRN, sG); digitalWrite(S_YEL, sY); digitalWrite(S_RED, sR);
  digitalWrite(W_GRN, wG); digitalWrite(W_YEL, wY); digitalWrite(W_RED, wR);
}

void sendTrafficTelemetry(String activeDirection, String nSignal, String eSignal, String sSignal, String wSignal, int waitSec, String modeType, String noteMsg) {
  if (WiFi.status() != WL_CONNECTED) return;

#if defined(ESP32)
  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

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
    doc["name"]        = "สี่แยกกลางอัสสัมชัญ (Central 4-Way Junction)";
    doc["location"]    = "สี่แยกสายหลัก อาคารเรียน A";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7558;
    pos["lng"] = 100.5024;

    JsonObject data = doc.createNestedObject("data_json");
    data["signal"]          = (nSignal == "green" || eSignal == "green" || sSignal == "green" || wSignal == "green") ? "green" : "yellow";
    data["activeDirection"] = activeDirection;
    data["nSignal"]         = nSignal;
    data["eSignal"]         = eSignal;
    data["sSignal"]         = sSignal;
    data["wSignal"]         = wSignal;
    data["waitSeconds"]     = waitSec;
    data["mode"]            = modeType;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE TRAFFIC] Code: %d | Active: %s\n", code, activeDirection.c_str());
    http.end();
  }
#elif defined(ARDUINO_UNOR4_WIFI)
  WiFiSSLClient sslClient;
  HttpClient http = HttpClient(sslClient, "kqkggjsjwbkodqyeddwj.supabase.co", 443);

  DynamicJsonDocument doc(512);
  doc["source"]      = "live";
  doc["system"]      = "traffic";
  doc["device_id"]   = "TR-1";
  doc["name"]        = "สี่แยกกลางอัสสัมชัญ (Central 4-Way Junction)";
  doc["location"]    = "สี่แยกสายหลัก";
  doc["recorded_at"] = "2026-09-26T12:00:00Z";
  doc["health"]      = "normal";
  doc["note"]        = noteMsg;

  JsonObject data = doc.createNestedObject("data_json");
  data["signal"]          = (nSignal == "green" || eSignal == "green" || sSignal == "green" || wSignal == "green") ? "green" : "yellow";
  data["activeDirection"] = activeDirection;
  data["nSignal"]         = nSignal;
  data["eSignal"]         = eSignal;
  data["sSignal"]         = sSignal;
  data["wSignal"]         = wSignal;
  data["waitSeconds"]     = waitSec;
  data["mode"]            = modeType;

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
  Serial.printf("[UNO R4 SUPABASE] Code: %d | Active: %s\n", statusCode, activeDirection.c_str());
#endif
}

// ==============================================================================
// 5. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[TRAFFIC 4-WAY SYSTEM] Starting...");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_N, INPUT);
  pinMode(ECHO_S, INPUT);
  pinMode(PIR_E, INPUT);
  pinMode(PIR_W, INPUT);
  pinMode(RESET_WIFI_PIN, INPUT_PULLUP);

  int ledPins[] = {N_RED, N_YEL, N_GRN, E_RED, E_YEL, E_GRN, 
                   S_RED, S_YEL, S_GRN, W_RED, W_YEL, W_GRN};
  for (int p : ledPins) {
    pinMode(p, OUTPUT);
  }

  setAllLights(HIGH, LOW, LOW,   LOW, LOW, HIGH,   LOW, LOW, HIGH,   LOW, LOW, HIGH);
  lastStateTime = millis();

  // ตรวจสอบการกดปุ่ม Reset Wi-Fi ตอนเปิดเครื่อง
  if (digitalRead(RESET_WIFI_PIN) == LOW) {
    Serial.println("\n⚠️ [RESET] Detected Reset Button Pressed -> Resetting Wi-Fi settings...");
#if defined(ESP32)
    wm.resetSettings();
#endif
    delay(1000);
  }

#if defined(ESP32)
  Serial.println("[Wi-Fi] Launching WiFiManager Portal: ACT-Traffic-Light-Setup");
  wm.setConfigPortalTimeout(180);
  bool res = wm.autoConnect("ACT-Traffic-Light-Setup");
  if (!res) {
    Serial.println("[Wi-Fi] Failed to connect or Portal timed out. Working offline...");
  } else {
    Serial.println("[Wi-Fi] Connected Successfully! IP: " + WiFi.localIP().toString());
    sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 4, "adaptive", "ระบบไฟจราจร 4 ทิศทางพร้อมทำงาน");
  }
#elif defined(ARDUINO_UNOR4_WIFI)
  WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 15) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 4, "adaptive", "ระบบไฟจราจร 4 ทิศทางพร้อมทำงาน");
  }
#endif
}

// ==============================================================================
// 6. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long currentMillis = millis();

#if defined(ESP32)
  if (digitalRead(RESET_WIFI_PIN) == LOW) {
    delay(3000);
    if (digitalRead(RESET_WIFI_PIN) == LOW) {
      Serial.println("\n⚠️ [Wi-Fi RESET] Button Held 3s -> Clearing Stored Wi-Fi & Restarting...");
      wm.resetSettings();
      ESP.restart();
    }
  }
#endif

  switch (currentState) {
    // 1. ฝั่งเหนือ (N)
    case STATE_N_GREEN:
      if (getDistance(ECHO_N) <= DETECT_DIST_CM && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] North (Ultrasonic): รถจอดรอ -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 8, "adaptive", "พบรถฝั่งเหนือ ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_N_YELLOW;
        setAllLights(LOW, HIGH, LOW,  LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("North (เหนือ)", "yellow", "red", "red", "red", 2, "adaptive", "ฝั่งเหนือ เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    case STATE_N_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_E_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setAllLights(LOW, LOW, HIGH,  HIGH, LOW, LOW,  LOW, LOW, HIGH,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("East (ตะวันออก)", "red", "green", "red", "red", 4, "adaptive", "สลับไฟเขียวให้ฝั่งตะวันออก");
      }
      break;

    // 2. ฝั่งตะวันออก (E)
    case STATE_E_GREEN:
      if (digitalRead(PIR_E) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] East (PIR): พบการเคลื่อนไหว -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("East (ตะวันออก)", "red", "green", "red", "red", 8, "adaptive", "พบรถฝั่งตะวันออก ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_E_YELLOW;
        setAllLights(LOW, LOW, HIGH,  LOW, HIGH, LOW,  LOW, LOW, HIGH,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("East (ตะวันออก)", "red", "yellow", "red", "red", 2, "adaptive", "ฝั่งตะวันออก เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    case STATE_E_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_S_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setAllLights(LOW, LOW, HIGH,  LOW, LOW, HIGH,  HIGH, LOW, LOW,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("South (ใต้)", "red", "red", "green", "red", 4, "adaptive", "สลับไฟเขียวให้ฝั่งใต้");
      }
      break;

    // 3. ฝั่งใต้ (S)
    case STATE_S_GREEN:
      if (getDistance(ECHO_S) <= DETECT_DIST_CM && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] South (Ultrasonic): รถจอดรอ -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("South (ใต้)", "red", "red", "green", "red", 8, "adaptive", "พบรถฝั่งใต้ ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_S_YELLOW;
        setAllLights(LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, HIGH, LOW,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("South (ใต้)", "red", "red", "yellow", "red", 2, "adaptive", "ฝั่งใต้ เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    case STATE_S_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_W_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setAllLights(LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, LOW, HIGH,  HIGH, LOW, LOW);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "green", 4, "adaptive", "สลับไฟเขียวให้ฝั่งตะวันตก");
      }
      break;

    // 4. ฝั่งตะวันตก (W)
    case STATE_W_GREEN:
      if (digitalRead(PIR_W) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] West (PIR): พบการเคลื่อนไหว -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "green", 8, "adaptive", "พบรถฝั่งตะวันตก ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_W_YELLOW;
        setAllLights(LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, HIGH, LOW);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "yellow", 2, "adaptive", "ฝั่งตะวันตก เปลี่ยนเป็นไฟเหลือง");
      }
      break;

    case STATE_W_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_N_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        setAllLights(HIGH, LOW, LOW,  LOW, LOW, HIGH,  LOW, LOW, HIGH,  LOW, LOW, HIGH);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 4, "adaptive", "วนกลับมาสลับไฟเขียวให้ฝั่งเหนือ");
      }
      break;
  }
}
