// PIN DEFINITIONS
#define TRIG_PARK     7
#define ECHO_PARK     8
#define LDR_PIN       A0
#define STREET_LIGHT  2  // ควบคุมฐานทรานซิสเตอร์ 2N2222

const float PARK_THRESHOLD_CM = 8.0;  // ระยะตรวจจับรถ (cm)
const int   DARK_THRESHOLD     = 500;  // ค่ายิ่งมืดยิ่งต่ำ (0-1023)

unsigned long lastSensorRead = 0;

float readDistance() {
  digitalWrite(TRIG_PARK, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PARK, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PARK, LOW);

  long duration = pulseIn(ECHO_PARK, HIGH, 25000);
  if (duration == 0) return 999.0;
  return (float)duration * 0.0343 / 2.0;
}

void setup() {
  Serial.begin(9600);
  pinMode(TRIG_PARK, OUTPUT);
  pinMode(ECHO_PARK, INPUT);
  pinMode(STREET_LIGHT, OUTPUT);
  digitalWrite(STREET_LIGHT, LOW);
}

void loop() {
  unsigned long currentMillis = millis();

  if (currentMillis - lastSensorRead >= 500) {
    lastSensorRead = currentMillis;

    // 1. ระบบตรวจจับที่จอดรถ
    float distance = readDistance();
    bool isParkOccupied = (distance <= PARK_THRESHOLD_CM && distance > 0);

    Serial.print("[Parking] Distance: ");
    Serial.print(distance);
    Serial.print(" cm -> ");
    Serial.println(isParkOccupied ? "OCCUPIED" : "FREE");

    // 2. ระบบไฟถนนอัตโนมัติ
    int ldrValue = analogRead(LDR_PIN);
    bool isDark = (ldrValue < DARK_THRESHOLD);
    digitalWrite(STREET_LIGHT, isDark ? HIGH : LOW);

    Serial.print("[Street Light] LDR: ");
    Serial.print(ldrValue);
    Serial.println(isDark ? " -> LIGHT ON" : " -> LIGHT OFF");
  }
}
