#include "model.h"
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

// WiFi & API Configuration
const char *ssid = "Head_Quarter";
const char *password = "35622659";
const char *serverUrl = "https://sourcesense.onrender.com/api/v1/readings"; // Cloud endpoint
const int node_id = 30; // Node ID we created in the backend

unsigned long lastCloudSend = 0;
const unsigned long CLOUD_INTERVAL = 120000; // 2 minutes in milliseconds

// Define GPIO Pins for ESP8266 (e.g. NodeMCU/Wemos)
const int RELAY_PIN = D1;
// Note: ESP8266 only has ONE analog pin (A0).
// For this simulation, we'll map all analog reads to A0.
// (In a real hardware setup with multiple MQ sensors, you'd need an ADC like ADS1115)
const int SENSOR_PIN = A0;

// Network Status
bool isCloudConnected = false;

// Instantiate the Classifier
Eloquent::ML::Port::RandomForest classifier;

// Helper function to calculate AQI from PM2.5 and PM10 using EPA standards
int calculateAQI(float pm25, float pm10) {
  // Simplified EPA AQI calculation for PM2.5
  int aqi25 = 0;
  if (pm25 <= 12.0) aqi25 = (50.0 / 12.0) * pm25;
  else if (pm25 <= 35.4) aqi25 = ((49.0) / (23.3)) * (pm25 - 12.1) + 51;
  else if (pm25 <= 55.4) aqi25 = ((49.0) / (19.9)) * (pm25 - 35.5) + 101;
  else if (pm25 <= 150.4) aqi25 = ((49.0) / (94.9)) * (pm25 - 55.5) + 151;
  else aqi25 = 201; // Very Unhealthy / Hazardous

  // Simplified EPA AQI calculation for PM10
  int aqi10 = 0;
  if (pm10 <= 54) aqi10 = (50.0 / 54.0) * pm10;
  else if (pm10 <= 154) aqi10 = ((49.0) / (99.0)) * (pm10 - 55.0) + 51;
  else if (pm10 <= 254) aqi10 = ((49.0) / (99.0)) * (pm10 - 155.0) + 101;
  else aqi10 = 151;

  // Return the higher of the two (driving pollutant)
  return (aqi25 > aqi10) ? aqi25 : aqi10;
}

// Variables for Public API
unsigned long lastPublicApiFetch = 0;
int cachedPublicAqi = -1;
const unsigned long PUBLIC_API_INTERVAL = 600000; // 10 minutes

// Helper function to fetch public AQI using Open-Meteo
int fetchPublicAQI() {
  if (WiFi.status() != WL_CONNECTED) return -1;
  
  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;
  
  // Open-Meteo Air Quality API for Dhaka (Free, no API key needed)
  http.begin(client, "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=23.8103&longitude=90.4125&current=us_aqi");
  int httpCode = http.GET();
  
  int publicAqi = -1;
  if (httpCode > 0) {
    String payload = http.getString();
    
    // Parse JSON manually: "us_aqi": 147
    int aqiIndex = payload.indexOf("\"us_aqi\":");
    if (aqiIndex > 0) {
      int startIndex = aqiIndex + 9;
      int endIndex = payload.indexOf("}", startIndex);
      if (endIndex > startIndex) {
        String aqiStr = payload.substring(startIndex, endIndex);
        publicAqi = aqiStr.toInt();
      }
    }
  }
  http.end();
  return publicAqi;
}

void sendToCloud(float temp, float hum, float pm1_0, float pm25, float pm10,
                 float *features, String classification);

void setup() {
  Serial.begin(115200);

  // Configure Pins
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Default off

  Serial.print("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    isCloudConnected = true;
    Serial.println("\nConnected to WiFi!");

    // Configure NTP time (UTC)
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Waiting for NTP time sync: ");
    time_t now = time(nullptr);
    while (now < 8 * 3600 * 2) {
      delay(500);
      Serial.print(".");
      now = time(nullptr);
    }
    Serial.println("");
  } else {
    Serial.println("\nFailed to connect to WiFi. Running in offline mode.");
  }

  Serial.println("SourceSense Edge-Native Node initialized (ESP8266).");
  Serial.println("TinyML Model Loaded: RandomForest Classifier");
}

void loop() {
  // 1. Read Sensor Data (Simulated analog reads mapped to physical values)
  // ESP8266 ADC is 10-bit (0-1023), unlike ESP32 which is 12-bit (0-4095).
  int rawAnalog = analogRead(SENSOR_PIN);

  // To make the simulation interesting, we'll add some random variance since
  // they all share A0
  float pm25 = (rawAnalog + random(-50, 50)) * (150.0 / 1023.0); // Scale 0-150 ug/m3
  float pm10 = (rawAnalog + random(-50, 50)) * (200.0 / 1023.0);
  float co = (rawAnalog + random(-20, 20)) * (5.0 / 1023.0);
  float no2 = (rawAnalog + random(-20, 20)) * (100.0 / 1023.0);
  float temp = (rawAnalog + random(-10, 10)) * (45.0 / 1023.0);
  float hum = (rawAnalog + random(-10, 10)) * (100.0 / 1023.0);

  // Prevent negative values from random variance
  if (pm25 < 0.0) pm25 = 0.0;
  if (pm10 < 0.0) pm10 = 0.0;
  if (co < 0.0) co = 0.0;
  if (no2 < 0.0) no2 = 0.0;
  if (temp < 0.0) temp = 0.0;
  if (hum < 0.0) hum = 0.0;

  // 2. Prepare 11-Feature Vector [pm10_pm25_ratio, pm2_5, pm10, MQ2, MQ4, MQ6, MQ7, MQ8, MQ131, MQ135, humidity]
  float ratio = (pm25 > 0) ? (pm10 / pm25) : -1.0;

  // Synthesize missing MQ sensors to align with backend 11-feature model for edge inference.
  float features[11] = {
      ratio, pm25, pm10, co + 100, no2 + 50,
      80.0, co * 1.5, 100.0, 50.0, co + 80, // MQs
      hum
  };

  float pm1_0 = pm25 * 0.8; // Simulated PM1.0

  // 3. Autonomous Edge Inference
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
      Serial.println("Event detected, but below local actuation threshold.");
      digitalWrite(RELAY_PIN, LOW);
    }

  } else {
    digitalWrite(RELAY_PIN, LOW);
  }

  // 5. Fetch Public API Data (every 10 minutes to avoid rate limits)
  if (millis() - lastPublicApiFetch >= PUBLIC_API_INTERVAL || cachedPublicAqi == -1) {
    Serial.println("Fetching public AQI from Open-Meteo API...");
    int fetchedAqi = fetchPublicAQI();
    if (fetchedAqi >= 0) {
      cachedPublicAqi = fetchedAqi;
      Serial.print("Public API AQI: ");
      Serial.println(cachedPublicAqi);
    } else {
      Serial.println("Failed to fetch Public AQI.");
    }
    lastPublicApiFetch = millis();
  }

  // 6. Dynamic Cloud Telemetry (Event-Triggered by Combined AQI)
  int localAqi = calculateAQI(pm25, pm10);
  int combinedAqi = localAqi;
  if (cachedPublicAqi >= 0) {
    combinedAqi = (localAqi + cachedPublicAqi) / 2; // Average local and public AQI
  }

  Serial.print("Local Computed AQI: ");
  Serial.print(localAqi);
  Serial.print(" | Combined AQI: ");
  Serial.println(combinedAqi);

  unsigned long currentInterval;
  if (combinedAqi > 50) {
    // Combined AQI is Moderate/Bad. Send data immediately (bypass 5-min timer)
    currentInterval = 0; 
  } else {
    // Air is Good. Save bandwidth, only send every 5 minutes (300,000 ms)
    currentInterval = 300000; 
  }

  if (millis() - lastCloudSend >= currentInterval) {
    if (isCloudConnected && WiFi.status() == WL_CONNECTED) {
      Serial.println("Threshold met. Sending payload to Cloud...");
      sendToCloud(temp, hum, pm1_0, pm25, pm10, features, classification);
    } else {
      Serial.println("Warning: Cloud offline. Relying on Edge-Native Fail-Safe.");
    }
    lastCloudSend = millis();
  }

  delay(5000); // 5 second control loop
}

void sendToCloud(float temp, float hum, float pm1_0, float pm25, float pm10,
                 float *features, String classification) {
                 
  WiFiClientSecure client;
  client.setInsecure(); // Allow connecting to HTTPS without verifying the certificate chain
  
  HTTPClient http;
  http.begin(client, serverUrl);
  http.addHeader("Content-Type", "application/json");

  // Get current time from NTP
  time_t now = time(nullptr);
  struct tm timeinfo;
  gmtime_r(&now, &timeinfo);

  char timeStringBuff[50];
  if (timeinfo.tm_year < (2020 - 1900)) {
    strcpy(timeStringBuff, "2026-10-02T12:00:00Z"); // Fallback static time if NTP fails
  } else {
    // Note the 'Z' appended to ensure standard ISO 8601 UTC string for backend
    strftime(timeStringBuff, sizeof(timeStringBuff), "%Y-%m-%dT%H:%M:%SZ", &timeinfo);
  }

  // Construct JSON Payload
  String payload = "{";
  payload += "\"node_id\":" + String(node_id) + ",";
  payload += "\"Timestamp\":\"" + String(timeStringBuff) + "\",";
  payload += "\"Temperature_C\":" + String(temp) + ",";
  payload += "\"Humidity_Percent\":" + String(hum) + ",";
  payload += "\"PM1.0\":" + String(pm1_0) + ",";
  payload += "\"PM2.5\":" + String(pm25) + ",";
  payload += "\"PM10\":" + String(pm10) + ",";
  payload += "\"MQ2\":" + String(features[3]) + ",";
  payload += "\"MQ4\":" + String(features[4]) + ",";
  payload += "\"MQ6\":" + String(features[5]) + ",";
  payload += "\"MQ7\":" + String(features[6]) + ",";
  payload += "\"MQ8\":" + String(features[7]) + ",";
  payload += "\"MQ131\":" + String(features[8]) + ",";
  payload += "\"MQ135\":" + String(features[9]);
  payload += "}";

  int httpResponseCode = http.POST(payload);
  Serial.print("HTTP POST Response code: ");
  Serial.println(httpResponseCode);

  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println(response);
  } else {
    Serial.print("Error code: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}
