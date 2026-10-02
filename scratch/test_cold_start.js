const https = require('https');

function ping(urlStr) {
  return new Promise((resolve) => {
    console.log(`Pinging ${urlStr} ...`);
    const start = Date.now();
    const req = https.get(urlStr, { timeout: 60000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        resolve({
          url: urlStr,
          status: res.statusCode,
          elapsed: (Date.now() - start) / 1000,
          renderRouting: res.headers['x-render-routing'],
          body: d.substring(0, 200)
        });
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url: urlStr, error: 'TIMEOUT (60s)' });
    });
    req.on('error', (err) => {
      resolve({ url: urlStr, error: err.message });
    });
  });
}

async function testAll() {
  const urls = [
    'https://sourcesense-backend.onrender.com/health',
    'https://sourcesense.onrender.com/health',
    'https://sourcesense-frontend.onrender.com/health',
    'https://sourcesense4.onrender.com/health'
  ];

  for (const u of urls) {
    const res = await ping(u);
    console.log(JSON.stringify(res, null, 2));
  }
}

testAll();
