const https = require('https');

const hosts = [
  'sourcesense4.onrender.com',
  'sourcesense.onrender.com',
  'sourcesense-backend.onrender.com',
  'sourcesense-frontend.onrender.com',
  'sourcesense-db.onrender.com'
];

hosts.forEach(host => {
  console.log(`Testing https://${host}/health ...`);
  const req = https.get(`https://${host}/health`, { timeout: 8000 }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => console.log(`[${host}] /health => STATUS: ${res.statusCode}, x-render-routing: ${res.headers['x-render-routing'] || 'ok'}, body: ${d.substring(0, 100)}`));
  });
  req.on('timeout', () => {
    req.destroy();
    console.log(`[${host}] TIMEOUT`);
  });
  req.on('error', err => {
    console.log(`[${host}] ERROR: ${err.message}`);
  });
});
