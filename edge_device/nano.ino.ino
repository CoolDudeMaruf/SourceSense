#include <DHT.h>
#include <SoftwareSerial.h>

//=====================================================
// DHT22
//=====================================================
#define DHT_PIN 2
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

//=====================================================
// MQ SENSOR ANALOG PINS
//=====================================================
#define MQ6_PIN     A0
#define MQ7_PIN     A1
#define MQ8_PIN     A2
#define MQ2_PIN     A3
#define MQ4_PIN     A4
#define MQ135_PIN   A5
#define MQ131_PIN   A6

//=====================================================
// ESP8266 COMMUNICATION
// Nano RX = D10
// Nano TX = D11
//=====================================================
SoftwareSerial espSerial(10, 11);

//=====================================================
// PMS7003 VARIABLES
//=====================================================
int pm1  = 0;
int pm25 = 0;
int pm10 = 0;

//=====================================================
// TIMING & WARMUP
//=====================================================
unsigned long previousMillis = 0;
const unsigned long interval = 2000;
const unsigned long warmupTime = 10000; // Testing 10 sec (change back to 300000 if needed)

//=====================================================
// READ PMS7003 (FIXED LOGIC)
//=====================================================
bool readPMSdata(Stream *s) {
  // Sync frame header 0x42 and 0x4D
  while (s->available() >= 32) {
    if (s->read() == 0x42) {
      if (s->peek() == 0x4D) {
        s->read(); // consume 0x4D
        
        uint8_t buffer[30];
        s->readBytes(buffer, 30);

        uint16_t sum = 0x42 + 0x4D;
        for (int i = 0; i < 28; i++) {
          sum += buffer[i];
        }

        uint16_t checksum = ((uint16_t)buffer[28] << 8) | buffer[29];

        if (sum == checksum) {
          // Standard Atmospheric values extraction
          pm1  = ((uint16_t)buffer[8]  << 8) | buffer[9];   // Bytes 10 & 11 in total frame
          pm25 = ((uint16_t)buffer[10] << 8) | buffer[11];  // Bytes 12 & 13 in total frame
          pm10 = ((uint16_t)buffer[12] << 8) | buffer[13];  // Bytes 14 & 15 in total frame
          return true;
        }
      }
    }
  }
  return false;
}

//=====================================================
// READ AVERAGE ADC
//=====================================================
int readAverage(int pin, int samples = 10) {
  long total = 0;
  for (int i = 0; i < samples; i++) {
    total += analogRead(pin);
    delay(5);
  }
  return total / samples;
}

//=====================================================
// SETUP
//=====================================================
void setup() {
  Serial.begin(9600);     // PMS7003 Hardware Serial
  espSerial.begin(9600);  // ESP8266 Software Serial
  dht.begin();
  analogReference(DEFAULT);

  // Warmup timer
  unsigned long start = millis();
  while (millis() - start < warmupTime) {
    readPMSdata(&Serial);
    delay(100);
  }
}

//=====================================================
// LOOP
//=====================================================
void loop() {
  // Always update PMS values continuously
  readPMSdata(&Serial);

  unsigned long current = millis();
  if (current - previousMillis < interval) return;
  previousMillis = current;

  // READ MQ SENSORS
  int mq6   = readAverage(MQ6_PIN);
  int mq7   = readAverage(MQ7_PIN);
  int mq8   = readAverage(MQ8_PIN);
  int mq2   = readAverage(MQ2_PIN);
  int mq4   = readAverage(MQ4_PIN);
  int mq135 = readAverage(MQ135_PIN);
  int mq131 = readAverage(MQ131_PIN);

  // READ DHT22
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  if (isnan(temperature)) temperature = 0.0;
  if (isnan(humidity)) humidity = 0.0;

  // SEND DATA TO ESP8266
  espSerial.print("MQ6=");   espSerial.print(mq6);
  espSerial.print(",MQ7=");  espSerial.print(mq7);
  espSerial.print(",MQ8=");  espSerial.print(mq8);
  espSerial.print(",MQ2=");  espSerial.print(mq2);
  espSerial.print(",MQ4=");  espSerial.print(mq4);
  espSerial.print(",MQ135=");espSerial.print(mq135);
  espSerial.print(",MQ131=");espSerial.print(mq131);

  espSerial.print(",TEMP="); espSerial.print(temperature, 2);
  espSerial.print(",HUM=");  espSerial.print(humidity, 2);

  espSerial.print(",PM1=");  espSerial.print(pm1);
  espSerial.print(",PM25="); espSerial.print(pm25);
  espSerial.print(",PM10="); espSerial.print(pm10);

  espSerial.println();
}
