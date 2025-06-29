const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3001;

const server = http.createServer((req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  
  // Обрабатываем OPTIONS запросы
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const requestUrl = url.parse(req.url);
  
  // Health check
  if (requestUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port: PORT }));
    return;
  }

  // BingX proxy
  if (requestUrl.pathname && requestUrl.pathname.startsWith('/bingx')) {
    const bingxPath = requestUrl.pathname.replace('/bingx', '') || '/';
    const bingxUrl = `https://open-api.bingx.com${bingxPath}${requestUrl.search || ''}`;
    
    console.log(`🔄 [BingX-Proxy] ${req.method} ${bingxUrl}`);
    
    const options = {
      hostname: 'open-api.bingx.com',
      port: 443,
      path: bingxPath + (requestUrl.search || ''),
      method: req.method,
      headers: {
        ...req.headers,
        'host': 'open-api.bingx.com',
        'origin': 'https://open-api.bingx.com'
      }
    };

    const proxyReq = https.request(options, (proxyRes) => {
      console.log(`✅ [BingX-Proxy] Response ${proxyRes.statusCode}`);
      
      // Перенаправляем статус и заголовки 
      res.writeHead(proxyRes.statusCode, {
        ...proxyRes.headers,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin'
      });
      
      // Передаем данные
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (error) => {
      console.error(`❌ [BingX-Proxy] Error:`, error.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
    });

    // Передаем тело запроса
    req.pipe(proxyReq);
    return;
  }

  // 404 для остальных путей
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not Found',
    message: 'Use /bingx for BingX API proxy or /health for health check'
  }));
});

server.listen(PORT, () => {
  console.log(`🚀 Node.js BingX CORS Proxy running on http://localhost:${PORT}`);
  console.log(`📡 BingX endpoint: http://localhost:${PORT}/bingx`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...');
  server.close(() => {
    process.exit(0);
  });
}); 