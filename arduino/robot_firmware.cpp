#include <Arduino.h>
#include <Servo.h>

// =====================
// PIN DEFINITIONS (EDIT THESE TO MATCH YOUR WIRING)
// =====================

// IR sensors (analog)
const int IR_L_PIN = A0;     // IR left
const int IR_R_PIN = A1;     // IR right

// Ultrasonic sensor (HC-SR04 style)
const int US_TRIG_PIN = 7;
const int US_ECHO_PIN = 8;

// Battery voltage divider input (analog)
const int BAT_PIN = A2;

// V575 Color Sensor (analog outputs R/G/B)
const int COLOR_R_PIN = A3;   // V575 "R" output
const int COLOR_G_PIN = A4;   // V575 "G" output
const int COLOR_B_PIN = A5;   // V575 "B" output

// Motor driver pins (generic H-bridge: IN1/IN2/PWM per motor)
const int L_IN1 = 2;
const int L_IN2 = 3;
const int L_PWM = 5;

const int R_IN1 = 4;
const int R_IN2 = 6;
const int R_PWM = 9;

// Servos
const int SERVO_CLAW_PIN = 10;
const int SERVO_LAUNCH_PIN = 11;

// =====================
// TUNING CONSTANTS (YOU MUST CALIBRATE THESE)
// =====================

int IR_THRESH = 500;          // IR threshold for line detection (calibrate!)
int OBSTACLE_CM = 12;         // stop if obstacle closer than this

// Servo angles (calibrate!)
int CLAW_OPEN = 20;
int CLAW_CLOSE = 95;

int LAUNCH_READY = 20;
int LAUNCH_FIRE = 110;

// Battery divider constants (set to your resistor values!)
const float ADC_REF = 5.0;     // UNO is typically 5V
const float ADC_MAX = 1023.0;

// If you use a voltage divider: Vbat -> R1 -> analog -> R2 -> GND
// Vbat = Vanalog * (R1 + R2) / R2
const float R1 = 10000.0;   // example 10k
const float R2 = 10000.0;   // example 10k

// =====================
// GLOBALS
// =====================

Servo servoClaw;
Servo servoLaunch;

String mode = "IDLE";

// current drive command
int cmdLeft = 0;
int cmdRight = 0;

// =====================
// SENSOR HELPERS
// =====================

float readBatteryV() {
  int raw = analogRead(BAT_PIN);
  float v = (raw * ADC_REF) / ADC_MAX;
  float vbat = v * (R1 + R2) / R2;
  return vbat;
}

long readUltrasonicCM() {
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);

  long duration = pulseIn(US_ECHO_PIN, HIGH, 25000); // timeout ~25ms
  if (duration == 0) return 999;
  long cm = duration / 58;
  return cm;
}

// V575 analog RGB (0..1023)
void readRGB(uint16_t &r, uint16_t &g, uint16_t &b) {
  r = analogRead(COLOR_R_PIN);
  g = analogRead(COLOR_G_PIN);
  b = analogRead(COLOR_B_PIN);
}

// =====================
// MOTOR HELPERS
// =====================

void setMotor(int in1, int in2, int pwmPin, int val) {
  val = constrain(val, -255, 255);

  if (val >= 0) {
    digitalWrite(in1, HIGH);
    digitalWrite(in2, LOW);
    analogWrite(pwmPin, val);
  } else {
    digitalWrite(in1, LOW);
    digitalWrite(in2, HIGH);
    analogWrite(pwmPin, -val);
  }
}

void driveLR(int left, int right) {
  setMotor(L_IN1, L_IN2, L_PWM, left);
  setMotor(R_IN1, R_IN2, R_PWM, right);
}

// =====================
// ACTION MACROS (SERVOS)
// =====================

void doAction(const String& name) {
  if (name == "STOP") {
    cmdLeft = 0;
    cmdRight = 0;
    mode = "STOP";
  }
  else if (name == "PICKUP_BOX") {
    mode = "PICKUP_BOX";
    servoClaw.write(CLAW_OPEN);
    delay(250);
    servoClaw.write(CLAW_CLOSE);
    delay(400);
  }
  else if (name == "DROP_BOX") {
    mode = "DROP_BOX";
    servoClaw.write(CLAW_OPEN);
    delay(500);
  }
  else if (name == "SHOOT") {
    mode = "SHOOT";
    servoLaunch.write(LAUNCH_READY);
    delay(250);
    servoLaunch.write(LAUNCH_FIRE);
    delay(300);
    servoLaunch.write(LAUNCH_READY);
    delay(250);
  }
}

// =====================
// SERIAL INPUT HELPERS (Minimal JSON parsing)
// =====================

String readLine() {
  static String buf = "";
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n') {
      String line = buf;
      buf = "";
      line.trim();
      return line;
    }
    buf += ch;
  }
  return "";
}

// Extract int from very simple JSON: {"left":123}
int extractInt(const String& s, const String& key, int defVal) {
  int k = s.indexOf("\"" + key + "\"");
  if (k < 0) return defVal;
  int colon = s.indexOf(':', k);
  if (colon < 0) return defVal;
  int end = s.indexOf(',', colon);
  if (end < 0) end = s.indexOf('}', colon);
  if (end < 0) return defVal;
  String val = s.substring(colon + 1, end);
  val.trim();
  return val.toInt();
}

// Extract string from simple JSON: {"cmd":"drive"}
String extractString(const String& s, const String& key, const String& defVal) {
  int k = s.indexOf("\"" + key + "\"");
  if (k < 0) return defVal;
  int colon = s.indexOf(':', k);
  if (colon < 0) return defVal;
  int q1 = s.indexOf('"', colon + 1);
  if (q1 < 0) return defVal;
  int q2 = s.indexOf('"', q1 + 1);
  if (q2 < 0) return defVal;
  return s.substring(q1 + 1, q2);
}

// =====================
// SETUP + LOOP
// =====================

void setup() {
  Serial.begin(115200);

  // Ultrasonic
  pinMode(US_TRIG_PIN, OUTPUT);
  pinMode(US_ECHO_PIN, INPUT);

  // Motors
  pinMode(L_IN1, OUTPUT);
  pinMode(L_IN2, OUTPUT);
  pinMode(L_PWM, OUTPUT);

  pinMode(R_IN1, OUTPUT);
  pinMode(R_IN2, OUTPUT);
  pinMode(R_PWM, OUTPUT);

  // V575 color sensor pins
  pinMode(COLOR_R_PIN, INPUT);
  pinMode(COLOR_G_PIN, INPUT);
  pinMode(COLOR_B_PIN, INPUT);

  // Servos
  servoClaw.attach(SERVO_CLAW_PIN);
  servoLaunch.attach(SERVO_LAUNCH_PIN);
  servoClaw.write(CLAW_OPEN);
  servoLaunch.write(LAUNCH_READY);

  mode = "IDLE";
}

void loop() {
  // ---- Read sensors ----
  int irL = analogRead(IR_L_PIN);
  int irR = analogRead(IR_R_PIN);
  long distCm = readUltrasonicCM();
  float batV = readBatteryV();

  uint16_t r, g, b;
  readRGB(r, g, b);

  // ---- Process incoming commands ----
  String line = readLine();
  if (line.length() > 0) {
    String cmd = extractString(line, "cmd", "");
    if (cmd == "drive") {
      cmdLeft = extractInt(line, "left", 0);
      cmdRight = extractInt(line, "right", 0);
      mode = "DRIVE";
    }
    else if (cmd == "action") {
      String name = extractString(line, "name", "");
      if (name.length() > 0) doAction(name);
    }
  }

  // ---- Apply drive with safety stop ----
  if (distCm < OBSTACLE_CM && mode == "DRIVE") {
    driveLR(0, 0);
    mode = "OBSTACLE_STOP";
  } else {
    driveLR(cmdLeft, cmdRight);
  }

  // ---- Emit telemetry as JSON line ----
  Serial.print("{\"t_ms\":");
  Serial.print(millis());

  Serial.print(",\"irL\":");
  Serial.print(irL);
  Serial.print(",\"irR\":");
  Serial.print(irR);

  Serial.print(",\"dist_cm\":");
  Serial.print(distCm);

  Serial.print(",\"bat_v\":");
  Serial.print(batV, 3);

  Serial.print(",\"rgb\":[");
  Serial.print(r); Serial.print(",");
  Serial.print(g); Serial.print(",");
  Serial.print(b); Serial.print("]");

  Serial.print(",\"mode\":\"");
  Serial.print(mode);
  Serial.println("\"}");

  delay(50); // ~20Hz telemetry
}
