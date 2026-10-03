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
#include "SmartCitySecrets.h"

// ==============================================================================
// 1. SUPABASE & WI-FI CONFIGURATION
// ==============================================================================
const String CLOUD_MODE   = "supabase"; 
const String SUPABASE_URL = SMARTCITY_SUPABASE_URL;
const String SUPABASE_KEY = SMARTCITY_SUPABASE_KEY;
const char* FALLBACK_SSID = SMARTCITY_WIFI_SSID;
const char* FALLBACK_PASS = SMARTCITY_WIFI_PASSWORD;

// ==============================================================================
// 2. PIN DEFINITIONS (4-WAY INTERSECTION)
// ==============================================================================
#if defined(ESP32)
  #define TRIG_PIN  5   
  #define ECHO_N    18   
  #define ECHO_S    19  

  #define PIR_E     4  
  #define PIR_W     16  

  #define N_RED     13  
  #define N_YEL     12  
  #define N_GRN     14

  #define E_RED     27  
  #define E_YEL     26  
  #define E_GRN     25

  #define S_RED     33 
  #define S_YEL     32 
  #define S_GRN     35

  #define W_RED     15 
  #define W_YEL     2 
  #define W_GRN     0

  #define RESET_WIFI_PIN 0 // ปุ่ม BOOT (GPIO 0)
#else
  // สำหรับ Arduino UNO R4 WiFi หรือ Arduino UNO
  #define TRIG_PIN  2   
  #define ECHO_N    3   
  #define ECHO_S    A4  

  #define PIR_E     A3  
  #define PIR_W     13  

  #define N_RED     4  
  #define N_YEL     5  
  #define N_GRN     6

  #define E_RED     7  
  #define E_YEL     8  
  #define E_GRN     9

  #define S_RED     10 
  #define S_YEL     11 
  #define S_GRN     12

  #define W_RED     A0 
  #define W_YEL     A1 
  #define W_GRN     A2

  #define RESET_WIFI_PIN 0
#endif

// ==============================================================================
// 3. CONSTANTS & TIMING (SAFETY & ANTI-COLLISION)
// ==============================================================================
#define SIGNAL_RED    0
#define SIGNAL_YELLOW 1
#define SIGNAL_GREEN  2

const float DETECT_DIST_CM            = 8.0;   
const unsigned long NORMAL_GREEN_TIME = 4000;  // เวลาไฟเขียวปกติ 4 วินาที
const unsigned long EXTENDED_GREEN_TIME = 8000; // เวลาไฟเขียวขยาย (เมื่อมีรถต่อคิว) 8 วินาที
const unsigned long YELLOW_TIME       = 1500;  // เวลาไฟเหลืองเตือนก่อนแดง 1.5 วินาที
const unsigned long ALL_RED_TIME      = 1200;  // ช่วงเคลียร์แยกไฟแดงทุกทิศทาง 1.2 วินาที (ป้องกันรถชน)
const unsigned long PREPARE_FLASH_TIME= 1000;  // ช่วงไฟเหลืองกระพริบเตือน "เตรียมตัวไป" 1.0 วินาที

enum TrafficState {
  STATE_N_GREEN, STATE_N_YELLOW, STATE_N_ALL_RED, STATE_PREPARE_E,
  STATE_E_GREEN, STATE_E_YELLOW, STATE_E_ALL_RED, STATE_PREPARE_S,
  STATE_S_GREEN, STATE_S_YELLOW, STATE_S_ALL_RED, STATE_PREPARE_W,
  STATE_W_GREEN, STATE_W_YELLOW, STATE_W_ALL_RED, STATE_PREPARE_N
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

  long duration = pulseIn(echoPin, HIGH, 15000);
  if (duration <= 0) return 999.0;
  float dist = (float)duration * 0.0343 / 2.0;
  if (dist < 1.0) return 999.0; // กรองค่าหลุด 0cm
  return dist;
}

// ฟังก์ชันควบคุมไฟแต่ละทิศทางอย่างชัดเจน (100% ปลอดภัย ไม่สลับตำแหน่งสี)
void setSignal(int rPin, int yPin, int gPin, uint8_t col) {
  digitalWrite(rPin, (col == SIGNAL_RED)    ? HIGH : LOW);
  digitalWrite(yPin, (col == SIGNAL_YELLOW) ? HIGH : LOW);
  digitalWrite(gPin, (col == SIGNAL_GREEN)  ? HIGH : LOW);
}

// ควบคุมไฟทั้ง 4 ทิศทางพร้อมกัน
void set4WaySignals(uint8_t nCol, uint8_t eCol, uint8_t sCol, uint8_t wCol) {
  setSignal(N_RED, N_YEL, N_GRN, nCol);
  setSignal(E_RED, E_YEL, E_GRN, eCol);
  setSignal(S_RED, S_YEL, S_GRN, sCol);
  setSignal(W_RED, W_YEL, W_GRN, wCol);
}

// สั่งไฟแดงหยุดทุกทิศทางเพื่อเคลียร์แยก (All-Red Clearance)
void setAllRed() {
  set4WaySignals(SIGNAL_RED, SIGNAL_RED, SIGNAL_RED, SIGNAL_RED);
}

// สั่งไฟเหลืองกระพริบเตือนทิศทางที่กำลังจะได้ไป (ทิศทางอื่นยังคงติดไฟแดง 100%)
void setPrepareFlashing(int targetDirection) { // 0: N, 1: E, 2: S, 3: W
  bool flashOn = (millis() / 200) % 2 == 0; // กระพริบสลับทุกๆ 200ms
  uint8_t targetSignal = flashOn ? SIGNAL_YELLOW : SIGNAL_RED;

  set4WaySignals(
    (targetDirection == 0) ? targetSignal : SIGNAL_RED,
    (targetDirection == 1) ? targetSignal : SIGNAL_RED,
    (targetDirection == 2) ? targetSignal : SIGNAL_RED,
    (targetDirection == 3) ? targetSignal : SIGNAL_RED
  );
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
    doc["name"]        = "บอร์ดไฟจราจร TR-1";
    doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject data = doc.createNestedObject("data_json");
    data["signal"]          = (nSignal == "green" || eSignal == "green" || sSignal == "green" || wSignal == "green") ? "green" : (nSignal == "yellow" || eSignal == "yellow" || sSignal == "yellow" || wSignal == "yellow") ? "yellow" : "red";
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
  HttpClient http = HttpClient(sslClient, SMARTCITY_SUPABASE_HOST, 443);
  http.setHttpResponseTimeout(4000);

  DynamicJsonDocument doc(512);
  doc["source"]      = "live";
  doc["system"]      = "traffic";
  doc["device_id"]   = "TR-1";
  doc["name"]        = "บอร์ดไฟจราจร TR-1";
  doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
  doc["health"]      = "normal";
  doc["note"]        = noteMsg;

  JsonObject data = doc.createNestedObject("data_json");
  data["signal"]          = (nSignal == "green" || eSignal == "green" || sSignal == "green" || wSignal == "green") ? "green" : (nSignal == "yellow" || eSignal == "yellow" || sSignal == "yellow" || wSignal == "yellow") ? "yellow" : "red";
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
  http.stop();
  sslClient.stop();

  Serial.print("[UNO R4 SUPABASE] Code: ");
  Serial.print(statusCode);
  Serial.print(" | Active: ");
  Serial.println(activeDirection);
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

  set4WaySignals(SIGNAL_GREEN, SIGNAL_RED, SIGNAL_RED, SIGNAL_RED);
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
#elif defined(ARDUINO_UNOR4_WIFI)
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastReconnect = 0;
    if (currentMillis - lastReconnect >= 10000) {
      lastReconnect = currentMillis;
      Serial.println("[Wi-Fi] Reconnecting...");
      WiFi.begin(FALLBACK_SSID, FALLBACK_PASS);
    }
  }
#endif

  switch (currentState) {
    // --------------------------------------------------------------------------
    // 1. ฝั่งเหนือ (NORTH)
    // --------------------------------------------------------------------------
    case STATE_N_GREEN:
      if (getDistance(ECHO_N) <= DETECT_DIST_CM && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] North (Ultrasonic): รถจอดรอ -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 8, "adaptive", "พบรถฝั่งเหนือ ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_N_YELLOW;
        set4WaySignals(SIGNAL_YELLOW, SIGNAL_RED, SIGNAL_RED, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("North (เหนือ)", "yellow", "red", "red", "red", 2, "adaptive", "ฝั่งเหนือ เปลี่ยนเป็นไฟเหลืองเตือนหยุด");
      }
      break;

    case STATE_N_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_N_ALL_RED;
        setAllRed(); // แดงทุกด้าน 1.2 วินาที เคลียร์แยก
        lastStateTime = currentMillis;
        sendTrafficTelemetry("All Red (ปลอดภัย)", "red", "red", "red", "red", 1, "safety", "หยุดรถทุกทิศทาง เคลียร์ทางแยก");
      }
      break;

    case STATE_N_ALL_RED:
      if (currentMillis - lastStateTime >= ALL_RED_TIME) {
        currentState = STATE_PREPARE_E;
        lastStateTime = currentMillis;
        sendTrafficTelemetry("East (ตะวันออก)", "red", "yellow", "red", "red", 1, "prepare", "ฝั่งตะวันออก ไฟเหลืองกระพริบเตรียมตัวไป");
      }
      break;

    case STATE_PREPARE_E:
      setPrepareFlashing(1); // ฝั่งตะวันออก (1) ไฟเหลืองกระพริบเตือนเตรียมไป
      if (currentMillis - lastStateTime >= PREPARE_FLASH_TIME) {
        currentState = STATE_E_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        set4WaySignals(SIGNAL_RED, SIGNAL_GREEN, SIGNAL_RED, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("East (ตะวันออก)", "red", "green", "red", "red", 4, "adaptive", "สลับไฟเขียวให้ฝั่งตะวันออก");
      }
      break;

    // --------------------------------------------------------------------------
    // 2. ฝั่งตะวันออก (EAST)
    // --------------------------------------------------------------------------
    case STATE_E_GREEN:
      if (digitalRead(PIR_E) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] East (PIR): พบการเคลื่อนไหว -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("East (ตะวันออก)", "red", "green", "red", "red", 8, "adaptive", "พบรถฝั่งตะวันออก ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_E_YELLOW;
        set4WaySignals(SIGNAL_RED, SIGNAL_YELLOW, SIGNAL_RED, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("East (ตะวันออก)", "red", "yellow", "red", "red", 2, "adaptive", "ฝั่งตะวันออก เปลี่ยนเป็นไฟเหลืองเตือนหยุด");
      }
      break;

    case STATE_E_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_E_ALL_RED;
        setAllRed(); // แดงทุกด้าน 1.2 วินาที เคลียร์แยก
        lastStateTime = currentMillis;
        sendTrafficTelemetry("All Red (ปลอดภัย)", "red", "red", "red", "red", 1, "safety", "หยุดรถทุกทิศทาง เคลียร์ทางแยก");
      }
      break;

    case STATE_E_ALL_RED:
      if (currentMillis - lastStateTime >= ALL_RED_TIME) {
        currentState = STATE_PREPARE_S;
        lastStateTime = currentMillis;
        sendTrafficTelemetry("South (ใต้)", "red", "red", "yellow", "red", 1, "prepare", "ฝั่งใต้ ไฟเหลืองกระพริบเตรียมตัวไป");
      }
      break;

    case STATE_PREPARE_S:
      setPrepareFlashing(2); // ฝั่งใต้ (2) ไฟเหลืองกระพริบเตือนเตรียมไป
      if (currentMillis - lastStateTime >= PREPARE_FLASH_TIME) {
        currentState = STATE_S_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        set4WaySignals(SIGNAL_RED, SIGNAL_RED, SIGNAL_GREEN, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("South (ใต้)", "red", "red", "green", "red", 4, "adaptive", "สลับไฟเขียวให้ฝั่งใต้");
      }
      break;

    // --------------------------------------------------------------------------
    // 3. ฝั่งใต้ (SOUTH)
    // --------------------------------------------------------------------------
    case STATE_S_GREEN:
      if (getDistance(ECHO_S) <= DETECT_DIST_CM && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] South (Ultrasonic): รถจอดรอ -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("South (ใต้)", "red", "red", "green", "red", 8, "adaptive", "พบรถฝั่งใต้ ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_S_YELLOW;
        set4WaySignals(SIGNAL_RED, SIGNAL_RED, SIGNAL_YELLOW, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("South (ใต้)", "red", "red", "yellow", "red", 2, "adaptive", "ฝั่งใต้ เปลี่ยนเป็นไฟเหลืองเตือนหยุด");
      }
      break;

    case STATE_S_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_S_ALL_RED;
        setAllRed(); // แดงทุกด้าน 1.2 วินาที เคลียร์แยก
        lastStateTime = currentMillis;
        sendTrafficTelemetry("All Red (ปลอดภัย)", "red", "red", "red", "red", 1, "safety", "หยุดรถทุกทิศทาง เคลียร์ทางแยก");
      }
      break;

    case STATE_S_ALL_RED:
      if (currentMillis - lastStateTime >= ALL_RED_TIME) {
        currentState = STATE_PREPARE_W;
        lastStateTime = currentMillis;
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "yellow", 1, "prepare", "ฝั่งตะวันตก ไฟเหลืองกระพริบเตรียมตัวไป");
      }
      break;

    case STATE_PREPARE_W:
      setPrepareFlashing(3); // ฝั่งตะวันตก (3) ไฟเหลืองกระพริบเตือนเตรียมไป
      if (currentMillis - lastStateTime >= PREPARE_FLASH_TIME) {
        currentState = STATE_W_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        set4WaySignals(SIGNAL_RED, SIGNAL_RED, SIGNAL_RED, SIGNAL_GREEN);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "green", 4, "adaptive", "สลับไฟเขียวให้ฝั่งตะวันตก");
      }
      break;

    // --------------------------------------------------------------------------
    // 4. ฝั่งตะวันตก (WEST)
    // --------------------------------------------------------------------------
    case STATE_W_GREEN:
      if (digitalRead(PIR_W) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] West (PIR): พบการเคลื่อนไหว -> ยืดไฟเขียว 8s");
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "green", 8, "adaptive", "พบรถฝั่งตะวันตก ยืดเวลาไฟเขียว");
      }
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_W_YELLOW;
        set4WaySignals(SIGNAL_RED, SIGNAL_RED, SIGNAL_RED, SIGNAL_YELLOW);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("West (ตะวันตก)", "red", "red", "red", "yellow", 2, "adaptive", "ฝั่งตะวันตก เปลี่ยนเป็นไฟเหลืองเตือนหยุด");
      }
      break;

    case STATE_W_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_W_ALL_RED;
        setAllRed(); // แดงทุกด้าน 1.2 วินาที เคลียร์แยก
        lastStateTime = currentMillis;
        sendTrafficTelemetry("All Red (ปลอดภัย)", "red", "red", "red", "red", 1, "safety", "หยุดรถทุกทิศทาง เคลียร์ทางแยก");
      }
      break;

    case STATE_W_ALL_RED:
      if (currentMillis - lastStateTime >= ALL_RED_TIME) {
        currentState = STATE_PREPARE_N;
        lastStateTime = currentMillis;
        sendTrafficTelemetry("North (เหนือ)", "yellow", "red", "red", "red", 1, "prepare", "ฝั่งเหนือ ไฟเหลืองกระพริบเตรียมตัวไป");
      }
      break;

    case STATE_PREPARE_N:
      setPrepareFlashing(0); // ฝั่งเหนือ (0) ไฟเหลืองกระพริบเตือนเตรียมไป
      if (currentMillis - lastStateTime >= PREPARE_FLASH_TIME) {
        currentState = STATE_N_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME;
        set4WaySignals(SIGNAL_GREEN, SIGNAL_RED, SIGNAL_RED, SIGNAL_RED);
        lastStateTime = currentMillis;
        sendTrafficTelemetry("North (เหนือ)", "green", "red", "red", "red", 4, "adaptive", "วนกลับมาสลับไฟเขียวให้ฝั่งเหนือ");
      }
      break;
  }
}
