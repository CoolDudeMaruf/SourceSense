#include "model.h"

// Define GPIO Pins
const int RELAY_PIN = 12;
const int SENSOR_PM25_PIN = 34; // Analog pin for PM2.5
const int SENSOR_PM10_PIN = 35; // Analog pin for PM10
const int SENSOR_CO_PIN = 32;   // Analog pin for CO
const int SENSOR_NO2_PIN = 33;  // Analog pin for NO2
const int SENSOR_TEMP_PIN = 25; // Analog pin for Temperature
const int SENSOR_HUM_PIN = 26;  // Analog pin for Humidity

// Network Status
bool isCloudConnected = false;

// Instantiate the Classifier
Eloquent::ML::Port::RandomForest classifier;

void setup() {
  Serial.begin(115200);
  
  // Configure Pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Default off
  
  Serial.println("SourceSense Edge-Native Node initialized.");
  Serial.println("TinyML Model Loaded: RandomForest Classifier");
}

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
  
  // 3. Autonomous Edge Inference
  Serial.print("Running local inference... ");
  int classIdx = classifier.predict(features);
  String classification = classifier.predictLabel(features);
  Serial.println(classification);
  
  // 4. Fail-Safe Local Actuation Logic (Decoupled from Cloud)
  // Even if LoRaWAN/cellular is down, the edge triggers critical relays.
  if (classification == "vehicle_combustion" || 
      classification == "waste_burning" || 
      classification == "construction_dust") {
        
      // Ensure local threshold is actually hazardous before spraying
      if (pm25 > 50.0 || pm10 > 80.0) {
        Serial.println("CRITICAL EVENT: Triggering Misting Relays Locally!");
        digitalWrite(RELAY_PIN, HIGH);
      } else {
        Serial.println("Event detected, but below local actuation threshold.");
        digitalWrite(RELAY_PIN, LOW);
      }
      
  } else {
      // "clean" or "humid_haze"
      digitalWrite(RELAY_PIN, LOW);
  }

  // 5. Cloud Telemetry (Fire-and-Forget)
  if (isCloudConnected) {
    // Send data to FastAPI backend for spatial analytics and React dashboard
    sendToCloud(features, classification);
  } else {
    Serial.println("Warning: Cloud offline. Relying on Edge-Native Fail-Safe.");
  }

  delay(5000); // 5 second control loop
}

void sendToCloud(float* features, String classification) {
  // Implementation for LoRaWAN / Cellular MQTT payload transmission
  // (Let the cloud handle historical analytics, predictive forecasting, etc.)
}
