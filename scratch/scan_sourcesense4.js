const https = require('https');

const candidates = [
  'sourcesense-4.onrender.com',
  'sourcesense4.onrender.com',
  'sourcesense-4-backend.onrender.com',
  'sourcesense-backend-4.onrender.com',
  'sourcesense4-backend.onrender.com',
  'sourcesense-4-api.onrender.com',
  'sourcesense4-api.onrender.com',
  'sourcesense-app.onrender.com',
  'sourcesense4-app.onrender.com',
  'sourcesense-backend.onrender.com',
  'sourcesense.onrender.com'
];

async function checkHost(host) {
  return new Promise((resolve) => {
    const req = https.get(`https://${host}/health`, { timeout: 7000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        resolve({
          host,
          statusCode: res.statusCode,
          renderRouting: res.headers['x-render-routing'] || 'ok',
          body: data.substring(0, 150)
        });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ host, error: 'TIMEOUT' }); });
    req.on('error', (e) => { resolve({ host, error: e.message }); });
  });
}

async function run() {
  console.log("Scanning candidate Render domain names...");
  for (const h of candidates) {
    const res = await checkHost(h);
    console.log(JSON.stringify(res));
  }
}

run();
