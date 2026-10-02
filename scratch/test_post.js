const https = require('https');

const data = JSON.stringify({
  node_id: 30,
  Timestamp: "2026-10-02T12:00:00Z",
  Temperature_C: 25.0,
  Humidity_Percent: 60.0,
  "PM1.0": 10.0,
  "PM2.5": 12.0,
  PM10: 15.0,
  MQ2: 100.0,
  MQ4: 50.0,
  MQ6: 80.0,
  MQ7: 15.0,
  MQ8: 100.0,
  MQ131: 50.0,
  MQ135: 80.0,
  battery_level: 85.0,
  is_solar_charging: true
});

const urls = [
  'https://sourcesense4.onrender.com/api/v1/readings',
  'https://sourcesense.onrender.com/api/v1/readings',
  'https://sourcesense-backend.onrender.com/api/v1/readings',
  'https://sourcesense-backend-1.onrender.com/api/v1/readings'
];

urls.forEach(urlStr => {
  const url = new URL(urlStr);
  const req = https.request({
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`[${url.hostname}] STATUS: ${res.statusCode} | x-render-routing: ${res.headers['x-render-routing'] || 'N/A'}`);
      console.log(`[${url.hostname}] BODY: ${body.substring(0, 100)}\n`);
    });
  });

  req.on('error', (e) => console.error(`[${url.hostname}] ERROR: ${e.message}\n`));
  req.write(data);
  req.end();
});
