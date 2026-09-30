#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include "SmartCitySecrets.h"

// ==============================================================================
// 1. SUPABASE CLOUD & NTP CONFIGURATION
// ==============================================================================
const String CLOUD_MODE   = "supabase"; 
const String SUPABASE_URL = SMARTCITY_SUPABASE_URL;
const String SUPABASE_KEY = SMARTCITY_SUPABASE_KEY;

const char* ntpServer1    = "time.navy.mi.th";
const char* ntpServer2    = "time2.navy.mi.th";
const char* ntpServer3    = "pool.ntp.org";
const long  gmtOffset_sec = 7 * 3600;  // GMT+7 (Bangkok)
const int   daylightOffset_sec = 0;

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
const int TOTAL_SLOTS      = 8;   // จำนวนช่องจอดทั้งหมด

unsigned long entriesSinceBoot = 0;
unsigned long exitsSinceBoot   = 0;

unsigned long lastSenseTime = 0;
unsigned long lastClockTime = 0;
unsigned long lastCloudTime = 0;
unsigned long lockInTime    = 0;
unsigned long lockOutTime   = 0;
bool inSensorActive  = false;
bool outSensorActive = false;

const unsigned long SENSOR_INTERVAL = 40;    // ตรวจสอบเซนเซอร์ทุกๆ 40ms
const unsigned long COOLDOWN        = 800;   // หน่วงเวลากันนับซ้ำ 0.8 วินาที
const unsigned long CLOCK_INTERVAL  = 1000;  // อัปเดตนาฬิกาทุก 1 วินาที
const unsigned long CLOUD_INTERVAL  = 15000; // ส่ง Cloud ทุก 15 วินาทีเป็นอย่างน้อย

// ==============================================================================
// 4. HELPER FUNCTIONS & TELEMETRY
// ==============================================================================
int getAvailableSlots() {
  long netParked = (long)entriesSinceBoot - (long)exitsSinceBoot;
  if (netParked < 0) netParked = 0;
  if (netParked > TOTAL_SLOTS) netParked = TOTAL_SLOTS;
  return TOTAL_SLOTS - netParked;
}

int getOccupiedSlots() {
  return TOTAL_SLOTS - getAvailableSlots();
}

void sendParkingTelemetry(String noteMsg) {
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
  doc["system"]      = "parking";
  doc["device_id"]   = "PK-1";
  doc["name"]        = "ระบบที่จอดรถอัจฉริยะ PK-1";
  doc["location"]    = "ตำแหน่งยังไม่ยืนยัน";
  doc["health"]      = "normal";
  doc["note"]        = noteMsg;

  JsonObject data = doc.createNestedObject("data_json");
  data["occupied"]   = getOccupiedSlots();
  data["available"]  = getAvailableSlots();
  data["total"]      = TOTAL_SLOTS;
  data["entries"]    = entriesSinceBoot;
  data["exits"]      = exitsSinceBoot;
  data["status"]     = getAvailableSlots() > 0 ? "available" : "full";

  String jsonBody;
  serializeJson(doc, jsonBody);
  int code = http.POST(jsonBody);
  Serial.printf("[SUPABASE PARKING] Code: %d | Available: %d/%d\n", code, getAvailableSlots(), TOTAL_SLOTS);
  http.end();
}
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
  display.setTextColor(SSD1306_WHITE);

  // เส้นขอบบน
  display.drawLine(0, 4, 128, 4, SSD1306_WHITE);

  // ส่วนแสดง Available 8/8
  int available = getAvailableSlots();
  display.setTextSize(2);
  display.setCursor(0, 14);
  String availStr = "Avail " + String(available) + "/" + String(TOTAL_SLOTS);
  int xPos = (128 - (availStr.length() * 12)) / 2;
  if (xPos < 0) xPos = 0;
  display.setCursor(xPos, 14);
  display.print(availStr);

  // เส้นขอบล่าง
  display.drawLine(0, 36, 128, 36, SSD1306_WHITE);

  // ส่วนแสดงเวลาและวันที่ (HH:MM:SS DATE)
  struct tm timeinfo;
  if (getLocalTime(&timeinfo)) {
    char timeStr[24];
    strftime(timeStr, sizeof(timeStr), "%H:%M:%S", &timeinfo);
    
    char dateStr[24];
    strftime(dateStr, sizeof(dateStr), "%d/%m/%Y", &timeinfo);

    display.setTextSize(1);
    display.setCursor(16, 42);
    display.print(timeStr);
    display.print(" ");
    display.print(dateStr);
  } else {
    display.setTextSize(1);
    display.setCursor(20, 45);
    display.print(F("--:--:-- --/--/--"));
  }

  display.display();
}

// ==============================================================================
// 5. SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  Serial.println("\n[PARKING SYSTEM] Starting with WiFiManager...");

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  showOLEDMessage("CONNECTING WIFI...", "AP: ACT-Parking");

  pinMode(TRIG_IN, OUTPUT);
  pinMode(ECHO_IN, INPUT);
  pinMode(TRIG_OUT, OUTPUT);
  pinMode(ECHO_OUT, INPUT);

  WiFiManager wm;
  wm.setConfigPortalTimeout(180);
  if (!wm.autoConnect("ACT-Smart-Parking-Setup")) {
    Serial.println("[Wi-Fi] Failed to connect, running offline mode...");
  } else {
    Serial.println("[Wi-Fi] Connected! Syncing NTP time from time.navy.mi.th...");
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer1, ntpServer2, ntpServer3);
  }

  showOLEDMessage("CONNECTED!", "READY TO DETECT");
  delay(1000);
  updateOLEDDisplay();
  sendParkingTelemetry("ระบบที่จอดรถออนไลน์พร้อมทำงาน");

  Serial.println("[PARKING SYSTEM] Ready.");
}

// ==============================================================================
// 6. MAIN LOOP
// ==============================================================================
void loop() {
  unsigned long now = millis();

  // ตรวจจับเซนเซอร์
  if (now - lastSenseTime >= SENSOR_INTERVAL) {
    lastSenseTime = now;

    // 1. ตรวจจับรถเข้า (IN)
    float dIn = getDistance(TRIG_IN, ECHO_IN);
    bool inNow = dIn <= DETECT_DIST_CM;
    if (inNow && !inSensorActive && (now - lockInTime >= COOLDOWN)) {
      entriesSinceBoot++;
      lockInTime = now;
      Serial.printf("[PARKING SENSOR] Entry trigger: %lu | Available: %d/8\n", entriesSinceBoot, getAvailableSlots());
      updateOLEDDisplay();
      sendParkingTelemetry("รถเข้าที่จอด");
    }
    inSensorActive = inNow;

    // 2. ตรวจจับรถออก (OUT)
    float dOut = getDistance(TRIG_OUT, ECHO_OUT);
    bool outNow = dOut <= DETECT_DIST_CM;
    if (outNow && !outSensorActive && (now - lockOutTime >= COOLDOWN)) {
      exitsSinceBoot++;
      lockOutTime = now;
      Serial.printf("[PARKING SENSOR] Exit trigger: %lu | Available: %d/8\n", exitsSinceBoot, getAvailableSlots());
      updateOLEDDisplay();
      sendParkingTelemetry("รถออกจากที่จอด");
    }
    outSensorActive = outNow;
  }

  // อัปเดตเวลาบนจอ OLED ทุกๆ 1 วินาที
  if (now - lastClockTime >= CLOCK_INTERVAL) {
    lastClockTime = now;
    updateOLEDDisplay();
  }

  // ส่งข้อมูล Heartbeat ขึ้น Cloud ทุกๆ 15 วินาที
  if (now - lastCloudTime >= CLOUD_INTERVAL) {
    lastCloudTime = now;
    sendParkingTelemetry("อัปเดตสถานะปกติ");
  }
}


