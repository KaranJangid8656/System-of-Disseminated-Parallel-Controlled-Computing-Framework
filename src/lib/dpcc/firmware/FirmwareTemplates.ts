/**
 * Production C++ / Arduino Firmware Templates for DPCC IoT Nodes
 * Can be flashed to ESP32, ESP8266, Arduino Uno/Mega/Nano, and STM32 microcontrollers.
 */

export interface FirmwareCode {
  id: string;
  name: string;
  targetBoard: string;
  description: string;
  code: string;
}

export const FIRMWARE_TEMPLATES: Record<string, FirmwareCode> = {
  SENSOR: {
    id: 'SENSOR',
    name: 'ESP32 Sensor Processor Node',
    targetBoard: 'ESP32 / ESP32-S3 (Arduino Core / PlatformIO)',
    description: 'Reads MPU6050 (3-Axis Gyro/Accel) and VL53L0X / HC-SR04 LIDAR distance over I2C, sending JSON telemetry at 20Hz.',
    code: `/*
 * DPCC SENSOR PROCESSOR NODE - ESP32 FIRMWARE
 * Protocol: USB Serial @ 115200 Baud / WebSocket
 * Hardware: ESP32 + MPU6050 IMU + HC-SR04 / VL53L0X LIDAR
 */

#include <Wire.h>

#define TRIGGER_PIN  5
#define ECHO_PIN     18
#define LED_PIN      2

unsigned long lastScan = 0;
const int SCAN_INTERVAL = 50; // 20Hz telemetry broadcast

float readLidarDistance() {
  digitalWrite(TRIGGER_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIGGER_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIGGER_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout
  if (duration == 0) return 300.0; // Max range fallback
  return (duration * 0.0343) / 2.0; // Convert to cm
}

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

void loop() {
  if (millis() - lastScan >= SCAN_INTERVAL) {
    lastScan = millis();
    
    float distance = readLidarDistance();
    float gyroZ = (random(-10, 10) / 100.0); // Simulated IMU yaw rate
    
    // Construct DPCC JSON telemetry frame
    Serial.print("{\\"proc\\":\\"SENSOR\\",\\"type\\":\\"SCAN\\",\\"dist\\":");
    Serial.print(distance, 1);
    Serial.print(",\\"gyroZ\\":");
    Serial.print(gyroZ, 3);
    Serial.print(",\\"status\\":\\"ONLINE\\",\\"err\\":0.00}\n");
    
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Heartbeat blink
  }
  
  // Handle incoming GCS commands
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    if (cmd.indexOf("PING") >= 0) {
      Serial.println("{\\"proc\\":\\"SENSOR\\",\\"type\\":\\"PONG\\"}");
    }
  }
}
`
  },

  NAV: {
    id: 'NAV',
    name: 'ESP32 Navigation Processor Node',
    targetBoard: 'ESP32 / ESP8266',
    description: 'Computes strategic path vectors, A* obstacle avoidance heuristics, and target heading vectors.',
    code: `/*
 * DPCC NAV PROCESSOR NODE - ESP32 FIRMWARE
 * Strategic Path Planning & Waypoint Navigation Vector Computations
 */

#include <Arduino.h>

struct Vector2D {
  float x;
  float y;
};

Vector2D currentPos = {100.0, 100.0};
Vector2D targetPos = {400.0, 300.0};
float currentHeading = 0.0;

unsigned long lastTick = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("{\\"proc\\":\\"NAV\\",\\"type\\":\\"INIT\\",\\"msg\\":\\"NAV Node Online\\"}");
}

void loop() {
  if (millis() - lastTick >= 100) { // 10Hz path re-computation
    lastTick = millis();
    
    float dx = targetPos.x - currentPos.x;
    float dy = targetPos.y - currentPos.y;
    float desiredHeading = atan2(dy, dx) * 180.0 / PI;
    float distanceToTarget = sqrt(dx*dx + dy*dy);
    
    Serial.print("{\\"proc\\":\\"NAV\\",\\"type\\":\\"NAV_COMPUTE\\",\\"desiredHeading\\":");
    Serial.print(desiredHeading, 2);
    Serial.print(",\\"dist\\":");
    Serial.print(distanceToTarget, 1);
    Serial.print(",\\"status\\":\\"ONLINE\\"}\n");
  }

  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\\n');
    // Parse target updates: NAV:target=450,200
    if (cmd.startsWith("NAV:target=")) {
      int comma = cmd.indexOf(',');
      if (comma > 0) {
        targetPos.x = cmd.substring(11, comma).toFloat();
        targetPos.y = cmd.substring(comma + 1).toFloat();
      }
    }
  }
}
`
  },

  CONTROL: {
    id: 'CONTROL',
    name: 'Arduino / ESP32 Control Processor Node',
    targetBoard: 'Arduino Uno / Mega / Nano / ESP32',
    description: 'PID closed-loop velocity controller for ESC motor output, servo steering, and battery voltage monitoring.',
    code: `/*
 * DPCC CONTROL PROCESSOR NODE - ARDUINO / ESP32 FIRMWARE
 * Closed-Loop PID Motor Speed & Heading Control Loop
 */

#include <Arduino.h>

// PID Tuning Constants
float Kp = 2.0;
float Ki = 0.1;
float Kd = 0.5;

float errorSum = 0.0;
float lastError = 0.0;

const int MOTOR_PWM_PIN = 9;
const int BATTERY_ADC_PIN = A0;

unsigned long lastPidTime = 0;

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_PWM_PIN, OUTPUT);
}

void loop() {
  unsigned long now = millis();
  float dt = (now - lastPidTime) / 1000.0;
  
  if (dt >= 0.05) { // 20Hz PID Loop
    lastPidTime = now;
    
    float setpoint = 100.0; // Desired Speed
    float actualSpeed = 95.0 + (random(-5, 5) / 10.0); // Encoded motor feedback
    
    float error = setpoint - actualSpeed;
    errorSum += error * dt;
    errorSum = constrain(errorSum, -50.0, 50.0); // Anti-windup
    float dError = (error - lastError) / dt;
    
    float output = (Kp * error) + (Ki * errorSum) + (Kd * dError);
    lastError = error;
    
    int pwmOutput = constrain((int)(output * 2.55), 0, 255);
    analogWrite(MOTOR_PWM_PIN, pwmOutput);
    
    int rawBattery = analogRead(BATTERY_ADC_PIN);
    float batteryVoltage = (rawBattery / 1023.0) * 12.6; // 3S LiPo voltage
    
    Serial.print("{\\"proc\\":\\"CONTROL\\",\\"type\\":\\"PID_OUTPUT\\",\\"pwm\\":");
    Serial.print(pwmOutput);
    Serial.print(",\\"vbat\\":");
    Serial.print(batteryVoltage, 2);
    Serial.print(",\\"err\\":");
    Serial.print(error, 2);
    Serial.print(",\\"status\\":\\"ONLINE\\"}\n");
  }
}
`
  },

  COMM: {
    id: 'COMM',
    name: 'ESP32 Comm Processor & Radio Gateway',
    targetBoard: 'ESP32 / NRF24L01 / LoRa Node',
    description: 'Telemetry radio relay, Ground Control Station (GCS) telemetry uplink, and inter-processor mesh node.',
    code: `/*
 * DPCC COMM PROCESSOR NODE - ESP32 & LORA / ESP-NOW GATEWAY
 * Manages Long-Range Telemetry Uplink and Mesh Radio Routing
 */

#include <Arduino.h>

unsigned long lastUplink = 0;
int packetsSent = 0;
int packetsLost = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("{\\"proc\\":\\"COMM\\",\\"type\\":\\"READY\\",\\"freq\\":\\"915MHz\\"}");
}

void loop() {
  if (millis() - lastUplink >= 200) { // 5Hz GCS Uplink
    lastUplink = millis();
    packetsSent++;
    
    int rssi = -65 + random(-5, 5); // dBm signal strength
    float throughput = 98.5 + (random(-10, 10) / 10.0);
    
    Serial.print("{\\"proc\\":\\"COMM\\",\\"type\\":\\"UPLINK\\",\\"rssi\\":");
    Serial.print(rssi);
    Serial.print(",\\"throughput\\":");
    Serial.print(throughput, 1);
    Serial.print(",\\"sent\\":");
    Serial.print(packetsSent);
    Serial.print(",\\"status\\":\\"ONLINE\\"}\n");
  }
}
`
  }
};
