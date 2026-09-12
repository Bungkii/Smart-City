// PIN DEFINITIONS
// North-South (N-S)
#define TL_NS_RED     2
#define TL_NS_YELLOW  3
#define TL_NS_GREEN   4

// East-West (E-W)
#define TL_EW_RED     5
#define TL_EW_YELLOW  6
#define TL_EW_GREEN   7

unsigned long lastTrafficStep = 0;
int trafficState = 0;

const unsigned long TL_GREEN_TIME  = 4000; // เวลาไฟเขียว 4 วินาที
const unsigned long TL_YELLOW_TIME = 1500; // เวลาไฟเหลือง 1.5 วินาที

void setTrafficLights(bool nsR, bool nsY, bool nsG, bool ewR, bool ewY, bool ewG) {
  digitalWrite(TL_NS_RED, nsR);
  digitalWrite(TL_NS_YELLOW, nsY);
  digitalWrite(TL_NS_GREEN, nsG);
  digitalWrite(TL_EW_RED, ewR);
  digitalWrite(TL_EW_YELLOW, ewY);
  digitalWrite(TL_EW_GREEN, ewG);
}

void setup() {
  pinMode(TL_NS_RED, OUTPUT);
  pinMode(TL_NS_YELLOW, OUTPUT);
  pinMode(TL_NS_GREEN, OUTPUT);
  pinMode(TL_EW_RED, OUTPUT);
  pinMode(TL_EW_YELLOW, OUTPUT);
  pinMode(TL_EW_GREEN, OUTPUT);
}

void loop() {
  unsigned long currentMillis = millis();

  switch (trafficState) {
    case 0: // NS: เขียว | EW: แดง
      setTrafficLights(LOW, LOW, HIGH, HIGH, LOW, LOW);
      if (currentMillis - lastTrafficStep >= TL_GREEN_TIME) {
        trafficState = 1;
        lastTrafficStep = currentMillis;
      }
      break;

    case 1: // NS: เหลือง | EW: แดง
      setTrafficLights(LOW, HIGH, LOW, HIGH, LOW, LOW);
      if (currentMillis - lastTrafficStep >= TL_YELLOW_TIME) {
        trafficState = 2;
        lastTrafficStep = currentMillis;
      }
      break;

    case 2: // NS: แดง | EW: เขียว
      setTrafficLights(HIGH, LOW, LOW, LOW, LOW, HIGH);
      if (currentMillis - lastTrafficStep >= TL_GREEN_TIME) {
        trafficState = 3;
        lastTrafficStep = currentMillis;
      }
      break;

    case 3: // NS: แดง | EW: เหลือง
      setTrafficLights(HIGH, LOW, LOW, LOW, HIGH, LOW);
      if (currentMillis - lastTrafficStep >= TL_YELLOW_TIME) {
        trafficState = 0;
        lastTrafficStep = currentMillis;
      }
      break;
  }
}
