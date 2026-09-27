#include <WiFi.h>
#include <WiFiManager.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

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

unsigned long entriesSinceBoot = 0;
unsigned long exitsSinceBoot = 0;

unsigned long lastSenseTime = 0;
unsigned long lockInTime    = 0;
unsigned long lockOutTime   = 0;
bool inSensorActive = false;
bool outSensorActive = false;

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

  display.setCursor(8, 24);
  display.print(F("IN since boot:  "));
  display.println(entriesSinceBoot);
  display.setCursor(8, 40);
  display.print(F("OUT since boot: "));
  display.println(exitsSinceBoot);
  display.setCursor(8, 56);
  display.print(F("Occupancy: unknown"));

  display.display();
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


  showOLEDMessage("CONNECTED!", "READY TO DETECT");
  delay(1000);
  updateOLEDDisplay();

  Serial.println("[PARKING SYSTEM] Entry/exit counters ready; occupancy telemetry disabled until verified sensing is installed.");
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
    bool inNow = dIn <= DETECT_DIST_CM;
    if (inNow && !inSensorActive && (now - lockInTime >= COOLDOWN)) {
      entriesSinceBoot++;
      lockInTime = now;
      Serial.printf("[PARKING SENSOR] Entry trigger since boot: %lu\n", entriesSinceBoot);
      updateOLEDDisplay();
    }
    inSensorActive = inNow;

    // 2. ตรวจจับรถออก (OUT)
    float dOut = getDistance(TRIG_OUT, ECHO_OUT);
    bool outNow = dOut <= DETECT_DIST_CM;
    if (outNow && !outSensorActive && (now - lockOutTime >= COOLDOWN)) {
      exitsSinceBoot++;
      lockOutTime = now;
      Serial.printf("[PARKING SENSOR] Exit trigger since boot: %lu\n", exitsSinceBoot);
      updateOLEDDisplay();
    }
    outSensorActive = outNow;
  }
}
