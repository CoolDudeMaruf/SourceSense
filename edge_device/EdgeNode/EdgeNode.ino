#include "model.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Define GPIO Pins
const int RELAY_PIN = 12;
const int SENSOR_PM25_PIN = 34; // Analog pin for PM2.5
const int SENSOR_PM10_PIN = 35; // Analog pin for PM10
const int SENSOR_CO_PIN = 32;   // Analog pin for CO
const int SENSOR_NO2_PIN = 33;  // Analog pin for NO2
const int SENSOR_TEMP_PIN = 25; // Analog pin for Temperature
const int SENSOR_HUM_PIN = 26;  // Analog pin for Humidity

// Network & Cloud Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* cloudApiUrl = "https://sourcesense-4.onrender.com/api/v1/readings"; // Cloud endpoint
const int node_id = 30; // Node ID

unsigned long lastCloudSend = 0;
const unsigned long CLOUD_INTERVAL = 120000; // 2 minutes (120,000 ms)

// Instantiate the Classifier
Eloquent::ML::Port::RandomForest classifier;

void setup() {
  Serial.begin(115200);
  
  // Configure Pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Default off
  
  Serial.println("SourceSense Edge-Native Node initialized.");
  Serial.println("TinyML Model Loaded: RandomForest Classifier");

  // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected. Cloud ready.");
}

//=====================================================
// LOOP
//=====================================================
void loop() {
  // 1. Read Sensor Data (Simulated analog reads mapped to physical values)
  float pm25 = analogRead(SENSOR_PM25_PIN) * (150.0 / 4095.0); // Scale 0-150 ug/m3
  float pm10 = analogRead(SENSOR_PM10_PIN) * (200.0 / 4095.0);
  float co   = analogRead(SENSOR_CO_PIN) * (5.0 / 4095.0);
  float no2  = analogRead(SENSOR_NO2_PIN) * (100.0 / 4095.0);
  float temp = analogRead(SENSOR_TEMP_PIN) * (45.0 / 4095.0);
  float hum  = analogRead(SENSOR_HUM_PIN) * (100.0 / 4095.0);

  // 2. Prepare Feature Vector [pm25, pm10, co, no2, temperature, humidity]
  float features[6] = {pm25, pm10, co, no2, temp, hum};
  
  // 3. Autonomous Edge Inference (Runs every 5 seconds)
  Serial.print("Running local inference... ");
  int classIdx = classifier.predict(features);
  String classification = classifier.predictLabel(features);
  Serial.println(classification);
  
  // 4. Fail-Safe Local Actuation Logic (Decoupled from Cloud)
  if (classification == "vehicle_combustion" || 
      classification == "waste_burning" || 
      classification == "construction_dust") {
        
      if (pm25 > 50.0 || pm10 > 80.0) {
        Serial.println("CRITICAL EVENT: Triggering Misting Relays Locally!");
        digitalWrite(RELAY_PIN, HIGH);
      } else {
        digitalWrite(RELAY_PIN, LOW);
      }
  } else {
      digitalWrite(RELAY_PIN, LOW);
  }

  // 5. Cloud Telemetry - Only send every 2 minutes!
  if (millis() - lastCloudSend >= CLOUD_INTERVAL) {
    if (WiFi.status() == WL_CONNECTED) {
      sendToCloud(features, classification);
    } else {
      Serial.println("Warning: Cloud offline. Relying on Edge-Native Fail-Safe.");
    }
    lastCloudSend = millis();
  }

  delay(5000); // 5 second control loop for real-time edge responses
}

void sendToCloud(float* features, String classification) {
  HTTPClient http;
  http.begin(cloudApiUrl);
  http.addHeader("Content-Type", "application/json");

  // Construct JSON Payload
  String payload = "{";
  payload += "\"node_id\": 99,"; // Example hardware node ID
  payload += "\"Timestamp\": \"2026-10-02T12:00:00Z\","; // Typically generated via NTP or edge RTC
  payload += "\"PM2.5\": " + String(features[0]) + ",";
  payload += "\"PM10\": " + String(features[1]) + ",";
  payload += "\"MQ7\": " + String(features[2]) + ","; // mapping CO to MQ7
  payload += "\"Temperature_C\": " + String(features[4]) + ",";
  payload += "\"Humidity_Percent\": " + String(features[5]);
  // Add other required fields with defaults to satisfy backend...
  payload += "}";

  Serial.println("Sending data to cloud...");
  int httpResponseCode = http.POST(payload);

  if (httpResponseCode > 0) {
    Serial.print("Cloud push successful. Response code: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("Cloud push failed. Error code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
