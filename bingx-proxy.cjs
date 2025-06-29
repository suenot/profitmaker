const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3001;

// Включаем CORS для всех запросов
app.use(cors());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', port: PORT });
});

// Простейший прокси для BingX
app.all('/bingx/*', async (req, res) => {
  try {
    const bingxUrl = 'https://open-api.bingx.com' + req.url.replace('/bingx', '');
    
    console.log(`🔄 [BingX-Proxy] ${req.method} ${bingxUrl}`);
    
    const response = await fetch(bingxUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'host': 'open-api.bingx.com',
        'origin': 'https://open-api.bingx.com',
        'referer': 'https://open-api.bingx.com/'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    });
    
    const data = await response.text();
    
    res.status(response.status);
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.set('Access-Control-Allow-Headers', '*');
    res.send(data);
    
    console.log(`✅ [BingX-Proxy] Response ${response.status}`);
    
  } catch (error) {
    console.error(`❌ [BingX-Proxy] Error:`, error.message);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple BingX CORS Proxy running on http://localhost:${PORT}`);
  console.log(`📡 BingX endpoint: http://localhost:${PORT}/bingx`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  process.exit(0);
}); 