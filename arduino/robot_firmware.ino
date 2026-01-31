#include <Arduino.h>
#include <Wire.h>
#include <Servo.h>

// ---------- OPTIONAL: TCS34725 color sensor ----------
#include "Adafruit_TCS34725.h"
// If your color sensor is not TCS34725, replace this section with your sensor library.

Adafruit_TCS34725 tcs = Adafruit_TCS34725(
  TCS34725_INTEGRATIONTIME_50MS,
  TCS34725_GAIN_4X
);

// ---------- Pins (EDIT THESE) ----------
const int IR_L_PIN = A0;     // IR left analog
const int IR_R_PIN = A1;     // IR right analog

const int US_TRIG_PIN = 7;   // ultrasonic trig
const int US_ECHO_PIN = 8;   // ultrasonic echo

const int BAT_PIN = A2;      // battery divider -> analog
// Battery divider: Vbat -> R1 -> analog -> R2 -> GND
// Vbat = analogV * (R1+R2)/R2

// Motor driver pins (generic H-bridge)
const int L_IN1 = 2;
const int L_IN2 = 3;
const int L_PWM = 5;

const int R_IN1 = 4;
const int R_IN2 = 6;
const int R_PWM = 9;

// Servos
const int SERVO_CLAW_PIN = 10;
const int SERVO_LAUNCH_PIN = 11;

Servo servoClaw;
Servo servoLaunch;

// ---------- Tuning ----------
int IR_THRESH = 500;          // EDIT after calibration
int OBSTACLE_CM = 12;         // obstacle distance threshold

// Servo positions (EDIT)
int CLAW_OPEN = 20;
int CLAW_CLOSE = 95;
int LAUNCH_READY = 20;
int LAUNCH_FIRE = 110;

// Battery divider constants (EDIT)
const float ADC_REF = 5.0;         // UNO typically 5V reference
const float ADC_MAX = 1023.0;
const float R1 = 10000.0;          // example 10k
const float R2 = 10000.0;          // example 10k

// ---------- State ----------
String mode = "IDLE";

// Current drive command
int cmdLeft = 0;
int cmdRight = 0;

// ---------- Helpers ----------
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
  long cm = duration / 58; // approx
  return cm;
}

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

void doAction(const String& name) {
  if (name == "STOP") {
    cmdLeft = 0; cmdRight = 0;
    mode = "STOP";
  }
  else if (name == "PICKUP_BOX") {
    mode = "PICKUP_BOX";
    // Simple: open -> lower -> close (you'll adjust timings for your arm geometry)
    servoClaw.write(CLAW_OPEN);
    delay(300);
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

bool readLineLeft(int ir)  { return ir < IR_THRESH; } // depends on sensor; invert if needed
bool readLineRight(int ir) { return ir < IR_THRESH; }

// Very simple RGB fetch; if no sensor, returns zeros
void readRGB(uint16_t &r, uint16_t &g, uint16_t &b) {
  uint16_t c;
  if (tcs.begin()) {
    tcs.getRawData(&r, &g, &b, &c);
  } else {
    r = g = b = 0;
  }
}

// ---------- Serial JSON parsing (minimal) ----------
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

// tiny helpers: extract int field from simple JSON {"left":123}
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

void setup() {
  Serial.begin(115200);

  pinMode(US_TRIG_PIN, OUTPUT);
  pinMode(US_ECHO_PIN, INPUT);

  pinMode(L_IN1, OUTPUT); pinMode(L_IN2, OUTPUT); pinMode(L_PWM, OUTPUT);
  pinMode(R_IN1, OUTPUT); pinMode(R_IN2, OUTPUT); pinMode(R_PWM, OUTPUT);

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
    } else if (cmd == "action") {
      String name = extractString(line, "name", "");
      doAction(name);
    }
  }

  // ---- Apply drive ----
  // Safety: if obstacle too close, slow/stop (controller can override but this saves crashes)
  if (distCm < OBSTACLE_CM && mode == "DRIVE") {
    driveLR(0, 0);
    mode = "OBSTACLE_STOP";
  } else {
    driveLR(cmdLeft, cmdRight);
  }

  // ---- Emit telemetry ----
  // JSON line
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

  delay(50); // ~20 Hz
}
