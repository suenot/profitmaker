const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Включаем CORS для всех запросов
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: false
}));

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`📡 [CORS-Proxy] ${req.method} ${req.url}`);
  next();
});

// Proxy для BingX API
app.use('/bingx', createProxyMiddleware({
  target: 'https://open-api.bingx.com',
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/bingx': '', // Убираем /bingx из пути
  },
  onProxyReq: (proxyReq, req, res) => {
    const fullUrl = `https://open-api.bingx.com${req.url.replace('/bingx', '')}`;
    console.log(`🔄 [BingX-Proxy] ${req.method} ${fullUrl}`);
    
    // Добавляем необходимые заголовки
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; CCXT-Proxy/1.0)');
    proxyReq.setHeader('Accept', 'application/json');
  },
  onProxyRes: (proxyRes, req, res) => {
    // Добавляем CORS заголовки к ответу
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
    
    console.log(`✅ [BingX-Proxy] Response ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`❌ [BingX-Proxy] Error:`, err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CORS Proxy Server is running',
    port: PORT,
    endpoints: {
      bingx: `http://localhost:${PORT}/bingx`
    }
  });
});

// Catch all для неопознанных путей
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'Use /bingx endpoint or /health for health check',
    availableEndpoints: [
      '/bingx - Proxy to BingX API',
      '/health - Health check'
    ]
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 BingX Proxy: http://localhost:${PORT}/bingx`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log(`\n🔧 Configure CCXT to use: http://localhost:${PORT}/bingx as base URL`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CORS Proxy Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down CORS Proxy Server...');
  process.exit(0);
}); 