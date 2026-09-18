// ==========================================
// PIN DEFINITIONS
// ==========================================
// เซนเซอร์ PIR ตรวจจับรถ
#define PIR_NS 2  // ฝั่งเหนือ-ใต้ (North-South)
#define PIR_EW 3  // ฝั่งตะวันออก-ตก (East-West)

// ไฟจราจรฝั่งเหนือ-ใต้ (NS)
#define NS_RED    8
#define NS_YELLOW 9
#define NS_GREEN  10

// ไฟจราจรฝั่งตะวันออก-ตก (EW)
#define EW_RED    5
#define EW_YELLOW 6
#define EW_GREEN  7

// ==========================================
// TIMING SETTINGS (มิลลิวินาที)
// ==========================================
const unsigned long NORMAL_GREEN_TIME   = 4000; // ไฟเขียวรอบปกติ 4 วินาที
const unsigned long EXTENDED_GREEN_TIME = 8000; // ไฟเขียวเมื่อมีรถ 8 วินาที
const unsigned long YELLOW_TIME         = 1500; // ไฟเหลืองเตือน 1.5 วินาที

// ==========================================
// STATE MACHINE (สถานะไฟจราจร)
// ==========================================
enum TrafficState {
  STATE_NS_GREEN,
  STATE_NS_YELLOW,
  STATE_EW_GREEN,
  STATE_EW_YELLOW
};

TrafficState currentState = STATE_NS_GREEN;
unsigned long lastStateTime = 0;
unsigned long currentGreenDuration = NORMAL_GREEN_TIME;

// ฟังก์ชันสั่งสถานะหลอดไฟทั้ง 2 ฝั่ง
void setLights(bool nsG, bool nsY, bool nsR, bool ewG, bool ewY, bool ewR) {
  digitalWrite(NS_GREEN, nsG);
  digitalWrite(NS_YELLOW, nsY);
  digitalWrite(NS_RED, nsR);
  
  digitalWrite(EW_GREEN, ewG);
  digitalWrite(EW_YELLOW, ewY);
  digitalWrite(EW_RED, ewR);
}

void setup() {
  Serial.begin(115200);
  
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
  
  Serial.println("[TRAFFIC] Smart Traffic Light System Started!");
}

void loop() {
  unsigned long currentMillis = millis();
  
  switch (currentState) {
    
    // ----------------------------------------
    // สถานะที่ 1: ฝั่งเหนือ-ใต้ (NS) กำลังไฟเขียว
    // ----------------------------------------
    case STATE_NS_GREEN:
      // ถ้า PIR ฝั่ง NS เจอการเคลื่อนไหว และเวลายังไม่ถูกยืด ให้ปรับเป็น 8 วินาที
      if (digitalRead(PIR_NS) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] NS: ตรวจพบรถ ยืดไฟเขียวเป็น 8 วินาที");
      }
      
      // หมดเวลาไฟเขียว สลับไปไฟเหลือง
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_NS_YELLOW;
        setLights(LOW, HIGH, LOW, LOW, LOW, HIGH); // NS: เหลือง, EW: แดง
        lastStateTime = currentMillis;
      }
      break;
      
    // ----------------------------------------
    // สถานะที่ 2: ฝั่งเหนือ-ใต้ (NS) กำลังไฟเหลือง
    // ----------------------------------------
    case STATE_NS_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_EW_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME; // รีเซ็ตเวลารอบใหม่เป็น 4 วินาที
        setLights(LOW, LOW, HIGH, HIGH, LOW, LOW); // NS: แดง, EW: เขียว
        lastStateTime = currentMillis;
        Serial.println("[TRAFFIC] EW: เปลี่ยนเป็นไฟเขียว");
      }
      break;
      
    // ----------------------------------------
    // สถานะที่ 3: ฝั่งตะวันออก-ตก (EW) กำลังไฟเขียว
    // ----------------------------------------
    case STATE_EW_GREEN:
      // ถ้า PIR ฝั่ง EW เจอการเคลื่อนไหว ให้ยืดไฟเขียวเป็น 8 วินาที
      if (digitalRead(PIR_EW) == HIGH && currentGreenDuration != EXTENDED_GREEN_TIME) {
        currentGreenDuration = EXTENDED_GREEN_TIME;
        Serial.println("[TRAFFIC] EW: ตรวจพบรถ ยืดไฟเขียวเป็น 8 วินาที");
      }
      
      // หมดเวลาไฟเขียว สลับไปไฟเหลือง
      if (currentMillis - lastStateTime >= currentGreenDuration) {
        currentState = STATE_EW_YELLOW;
        setLights(LOW, LOW, HIGH, LOW, HIGH, LOW); // NS: แดง, EW: เหลือง
        lastStateTime = currentMillis;
      }
      break;
      
    // ----------------------------------------
    // สถานะที่ 4: ฝั่งตะวันออก-ตก (EW) กำลังไฟเหลือง
    // ----------------------------------------
    case STATE_EW_YELLOW:
      if (currentMillis - lastStateTime >= YELLOW_TIME) {
        currentState = STATE_NS_GREEN;
        currentGreenDuration = NORMAL_GREEN_TIME; // รีเซ็ตเวลารอบใหม่เป็น 4 วินาที
        setLights(HIGH, LOW, LOW, LOW, LOW, HIGH); // NS: เขียว, EW: แดง
        lastStateTime = currentMillis;
        Serial.println("[TRAFFIC] NS: เปลี่ยนเป็นไฟเขียว");
      }
      break;
  }
}
