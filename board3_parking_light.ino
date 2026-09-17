#include <WiFi.h>
#include <WiFiManager.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ==========================================
// 1. OLED DISPLAY CONFIGURATION
// ==========================================
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET    -1
#define SCREEN_ADDRESS 0x3C

#define I2C_SDA 21
#define I2C_SCL 22

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// ==========================================
// 2. PIN DEFINITIONS & CONFIGURATION
// ==========================================
const String SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkGglMWJAnvbjXmdD76vRydjr7f1pQEttifQQ3ItVb42b96XoBfOG7DmGBBVlDN5DQGQ/exec";

// Ultrasonic 1: ทางเข้า (IN)
#define TRIG_IN   5
#define ECHO_IN   18

// Ultrasonic 2: ทางออก (OUT)
#define TRIG_OUT  19
#define ECHO_OUT  23

const float DETECT_DIST_CM = 5.0; // ระยะตรวจจับ 5 cm

int totalSlots = 5;
int availableSlots = 5;

unsigned long lastSenseTime = 0;
unsigned long lockInTime = 0;
unsigned long lockOutTime = 0;

// *** ปรับลด DELAY ค่าความไวต่างๆ ***
const unsigned long SENSOR_INTERVAL = 30; // อ่านค่าเซนเซอร์ทุกๆ 30ms (เดิม 100ms)
const unsigned long COOLDOWN        = 600; // หน่วงเวลากันนับซ้ำเหลือ 0.6 วินาที (เดิม 1.5s)

// ==========================================
// 3. OLED DISPLAY FUNCTIONS
// ==========================================
void updateOLEDDisplay() {
  display.clearDisplay();

  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(18, 4);
  display.print("SMART REST AREA");
  display.drawLine(0, 15, 128, 15, SSD1306_WHITE);

  display.setTextSize(3);
  display.setCursor(20, 24);
  display.print(availableSlots);

  display.setTextSize(1);
  display.setCursor(48, 28);
  display.print("/ ");
  display.print(totalSlots);
  display.setCursor(48, 40);
  display.print("SLOTS");

  display.drawLine(0, 52, 128, 52, SSD1306_WHITE);
  display.setCursor(20, 55);
  if (availableSlots <= 0) {
    display.print("STATUS: FULL !");
  } else {
    display.print("STATUS: AVAILABLE");
  }

  display.display();
}

void showOLEDMessage(String line1, String line2) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 15);
  display.println(line1);
  display.setCursor(0, 35);
  display.println(line2);
  display.display();
}

// ==========================================
// 4. SENSOR & CLOUD FUNCTIONS
// ==========================================
float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // ปรับ Timeout เหลือ 6000us (~1 เมตร) เพื่อไม่ให้ลูปค้างเวลารอสัญญาณ
  long duration = pulseIn(echoPin, HIGH, 6000);
  if (duration == 0) return 999.0;
  return (float)duration * 0.0343 / 2.0;
}

void syncCloud(String actionType) {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(2000); // ลด Timeout ในการส่งขึ้น Cloud เหลือ 2 วินาที

  HTTPClient http;
  String url = SCRIPT_URL + "?action=" + actionType + "&available=" + String(availableSlots);
  http.begin(client, url);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.GET();
  http.end();
}

void fetchInitialSetting() {
  if (WiFi.status() != WL_CONNECTED) return;
  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(3000);
  HTTPClient http;
  http.begin(client, SCRIPT_URL + "?action=get_status");
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  int code = http.GET();
  if (code == 200 || code == 302) {
    DynamicJsonDocument doc(512);
    deserializeJson(doc, http.getString());
    if (doc.containsKey("lots") && doc["lots"].containsKey("ลานจอด 1")) {
      totalSlots = doc["lots"]["ลานจอด 1"]["cap"].as<int>();
      availableSlots = doc["lots"]["ลานจอด 1"]["avail"].as<int>();
    }
  }
  http.end();
}

// ==========================================
// 5. SETUP & LOOP
// ==========================================
void setup() {
  Serial.begin(115200);

  Wire.begin(I2C_SDA, I2C_SCL);
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;);
  }

  showOLEDMessage("CONNECTING WIFI...", "SmartCity-Parking");

  pinMode(TRIG_IN, OUTPUT);
  pinMode(ECHO_IN, INPUT);
  pinMode(TRIG_OUT, OUTPUT);
  pinMode(ECHO_OUT, INPUT);

  WiFiManager wm;
  if (!wm.autoConnect("SmartParking-AP")) {
    ESP.restart();
  }

  showOLEDMessage("SYNCING WITH", "GOOGLE SHEETS...");
  fetchInitialSetting();
  updateOLEDDisplay();
}

void loop() {
  unsigned long now = millis();

  if (now - lastSenseTime >= SENSOR_INTERVAL) {
    lastSenseTime = now;

    float distIn  = getDistance(TRIG_IN, ECHO_IN);
    float distOut = getDistance(TRIG_OUT, ECHO_OUT);

    // 1. ตรวจจับรถขาเข้า (IN)
    if (distIn > 0 && distIn <= DETECT_DIST_CM && (now - lockInTime >= COOLDOWN)) {
      lockInTime = now;
      if (availableSlots > 0) {
        availableSlots--;
      }
      updateOLEDDisplay();
      Serial.printf("[PARK] CAR IN! Available slots: %d\n", availableSlots);
      syncCloud("park_in");
    }

    // 2. ตรวจจับรถขาออก (OUT)
    if (distOut > 0 && distOut <= DETECT_DIST_CM && (now - lockOutTime >= COOLDOWN)) {
      lockOutTime = now;
      if (availableSlots < totalSlots) {
        availableSlots++;
      } else {
        availableSlots = totalSlots;
      }
      updateOLEDDisplay();
      Serial.printf("[PARK] CAR OUT! Available slots: %d\n", availableSlots);
      syncCloud("park_out");
    }
  }
}
