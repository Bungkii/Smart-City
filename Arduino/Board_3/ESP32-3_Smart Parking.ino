#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==============================================================================
// 1. SUPABASE & CLOUD CONFIGURATION (บันทึก Wi-Fi ลง SQL)
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
// 2. OLED DISPLAY CONFIGURATION
// ==============================================================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

#define I2C_SDA 21
#define I2C_SCL 22

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==============================================================================
// 3. PIN DEFINITIONS & CONSTANTS
// ==============================================================================
// Ultrasonic 1: ทางเข้า (IN)
#define TRIG_IN   5
#define ECHO_IN   18

// Ultrasonic 2: ทางออก (OUT)
#define TRIG_OUT  19
#define ECHO_OUT  23

const float DETECT_DIST_CM = 6.0; // ระยะตรวจจับ 6 cm

int totalSlots     = 8;
int availableSlots = 8;

unsigned long lastSenseTime = 0;
unsigned long lockInTime    = 0;
unsigned long lockOutTime   = 0;

const unsigned long SENSOR_INTERVAL = 40;  // ตรวจสอบเซนเซอร์ทุกๆ 40ms
const unsigned long COOLDOWN        = 800; // หน่วงเวลากันนับซ้ำ 0.8 วินาที

// ==============================================================================
// 4. HELPER FUNCTIONS
// ==============================================================================
float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH, 30000); // Timeout 30ms (~500cm)
  if (duration == 0) return 999.0;
  return duration * 0.034 / 2.0;
}

void showOLEDMessage(String line1, String line2) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 20);
  display.println(line1);
  display.setCursor(10, 38);
  display.println(line2);
  display.display();
}

void updateOLEDDisplay() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(18, 5);
  display.println(F("ACT SMART PARKING"));

  display.drawLine(0, 16, 128, 16, SSD1306_WHITE);

  display.setCursor(10, 24);
  display.println(F("AVAILABLE SLOTS:"));

  display.setTextSize(2);
  display.setCursor(35, 38);
  display.print(availableSlots);
  display.print(F(" / "));
  display.print(totalSlots);

  if (availableSlots == 0) {
    display.setTextSize(1);
    display.setCursor(40, 56);
    display.print(F("[ FULL ]"));
  }

  display.display();
}

// บันทึกและจำค่า Wi-Fi ลง Supabase SQL (ตาราง settings)
void syncWiFiConfigToSupabase(String ssid, String pass) {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClientSecure secureClient;
  secureClient.setInsecure();
  secureClient.setTimeout(4000);

  HTTPClient http;
  http.begin(secureClient, SUPABASE_URL + "/settings");
  http.addHeader("apikey", SUPABASE_KEY);
  http.addHeader("Authorization", "Bearer " + SUPABASE_KEY);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Prefer", "resolution=merge-duplicates,return=minimal");

  String bodySsid = "{\"key\":\"wifi_ssid\",\"value\":\"" + ssid + "\",\"updated_at\":\"2026-09-26T12:00:00Z\"}";
  http.POST(bodySsid);

  if (pass.length() > 0) {
    String bodyPass = "{\"key\":\"wifi_pass\",\"value\":\"" + pass + "\",\"updated_at\":\"2026-09-26T12:00:00Z\"}";
    http.POST(bodyPass);
  }
  http.end();
  Serial.printf("[SUPABASE SQL] Synced Wi-Fi '%s' to settings table\n", ssid.c_str());
}

// ==============================================================================
// 5. SUPABASE & DASHBOARD TELEMETRY
// ==============================================================================
void sendParkingTelemetry(bool isOccupied, String bayId, String noteMsg) {
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
    doc["system"]      = "parking";
    doc["device_id"]   = "PK-01";
    doc["name"]        = "ลานจอดรถอัจฉริยะ (Smart Parking Bay 01)";
    doc["location"]    = "อาคารเซนต์คาเบรียล (Building A)";
    doc["recorded_at"] = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position_json");
    pos["lat"] = 13.7569;
    pos["lng"] = 100.5015;

    JsonObject data = doc.createNestedObject("data_json");
    data["occupied"] = isOccupied;
    data["bay"]      = bayId;
    data["vacant"]   = availableSlots;
    data["total"]    = totalSlots;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[SUPABASE PARKING] Status: %d\n", code);
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
    doc["system"]      = "parking";
    doc["deviceId"]    = "PK-01";
    doc["name"]        = "ลานจอดรถอัจฉริยะ (Smart Parking Bay 01)";
    doc["location"]    = "อาคารเซนต์คาเบรียล (Building A)";
    doc["recordedAt"]  = "2026-09-26T12:00:00Z";
    doc["health"]      = "normal";
    doc["note"]        = noteMsg;

    JsonObject pos = doc.createNestedObject("position");
    pos["lat"] = 13.7569;
    pos["lng"] = 100.5015;

    JsonObject data = doc.createNestedObject("data");
    data["occupied"] = isOccupied;
    data["bay"]      = bayId;
    data["vacant"]   = availableSlots;
    data["total"]    = totalSlots;

    String jsonBody;
    serializeJson(doc, jsonBody);
    int code = http.POST(jsonBody);
    Serial.printf("[DASHBOARD PARKING] Status: %d\n", code);
    http.end();
  }
}

// ==============================================================================
// 6. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[PARKING SYSTEM] Starting with WiFiManager...");

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  showOLEDMessage("CONNECTING WIFI...", "AP: 192.168.4.1");

  pinMode(TRIG_IN, OUTPUT);
  pinMode(ECHO_IN, INPUT);
  pinMode(TRIG_OUT, OUTPUT);
  pinMode(ECHO_OUT, INPUT);

  WiFiManager wm;
  if (!wm.autoConnect("SmartCity-Parking-AP")) {
    ESP.restart();
  }

  // ซิงก์ Wi-Fi ลง Supabase SQL
  syncWiFiConfigToSupabase(WiFi.SSID(), WiFi.psk());

  showOLEDMessage("CONNECTED!", "READY TO DETECT");
  delay(1000);
  updateOLEDDisplay();

  Serial.println("[PARKING SYSTEM] Ready & Connected to Cloud!");
  sendParkingTelemetry(false, "A-01", "ระบบจอดรถออนไลน์พร้อมทำงาน");
}

// ==============================================================================
// 7. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  if (now - lastSenseTime >= SENSOR_INTERVAL) {
    lastSenseTime = now;

    // 1. ตรวจจับรถเข้า (IN)
    float dIn = getDistance(TRIG_IN, ECHO_IN);
    if (dIn <= DETECT_DIST_CM && (now - lockInTime >= COOLDOWN)) {
      if (availableSlots > 0) {
        availableSlots--;
        lockInTime = now;
        Serial.printf("[PARKING EVENT] Car ENTERED. Remaining: %d/%d\n", availableSlots, totalSlots);
        updateOLEDDisplay();
        sendParkingTelemetry(true, "A-01", "ตรวจพบรถเข้าจอดในช่อง A-01");
      }
    }

    // 2. ตรวจจับรถออก (OUT)
    float dOut = getDistance(TRIG_OUT, ECHO_OUT);
    if (dOut <= DETECT_DIST_CM && (now - lockOutTime >= COOLDOWN)) {
      if (availableSlots < totalSlots) {
        availableSlots++;
        lockOutTime = now;
        Serial.printf("[PARKING EVENT] Car EXITED. Remaining: %d/%d\n", availableSlots, totalSlots);
        updateOLEDDisplay();
        sendParkingTelemetry(false, "A-01", "รถออกจากช่องจอด A-01");
      }
    }
  }
}