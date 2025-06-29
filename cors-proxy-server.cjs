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
    console.log(`🔄 [BingX-Proxy] ${req.method} https://open-api.bingx.com${req.url.replace('/bingx', '')}`);
    
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

// Proxy для Bybit API (на случай если понадобится)
app.use('/bybit', createProxyMiddleware({
  target: 'https://api.bybit.com',
  changeOrigin: true,
  secure: true,
  pathRewrite: {
    '^/bybit': '',
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`🔄 [Bybit-Proxy] ${req.method} https://api.bybit.com${req.url.replace('/bybit', '')}`);
    proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; CCXT-Proxy/1.0)');
    proxyReq.setHeader('Accept', 'application/json');
  },
  onProxyRes: (proxyRes, req, res) => {
    proxyRes.headers['Access-Control-Allow-Origin'] = '*';
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
    console.log(`✅ [Bybit-Proxy] Response ${proxyRes.statusCode} for ${req.url}`);
  },
  onError: (err, req, res) => {
    console.error(`❌ [Bybit-Proxy] Error:`, err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Универсальный proxy для других бирж
app.use('/exchange/:exchangeName', (req, res, next) => {
  const exchangeName = req.params.exchangeName;
  const targetUrls = {
    'binance': 'https://api.binance.com',
    'okx': 'https://www.okx.com',
    'kucoin': 'https://api.kucoin.com',
    'huobi': 'https://api.huobi.pro',
    'kraken': 'https://api.kraken.com',
    'bitfinex': 'https://api.bitfinex.com',
    'gateio': 'https://api.gateio.ws',
    'mexc': 'https://api.mexc.com',
    'bitget': 'https://api.bitget.com'
  };
  
  const targetUrl = targetUrls[exchangeName];
  if (!targetUrl) {
    return res.status(404).json({ error: `Exchange ${exchangeName} not supported` });
  }
  
  const proxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    secure: true,
    pathRewrite: {
      [`^/exchange/${exchangeName}`]: '',
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔄 [${exchangeName.toUpperCase()}-Proxy] ${req.method} ${targetUrl}${req.url.replace(`/exchange/${exchangeName}`, '')}`);
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (compatible; CCXT-Proxy/1.0)');
      proxyReq.setHeader('Accept', 'application/json');
    },
    onProxyRes: (proxyRes, req, res) => {
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept, Origin';
      console.log(`✅ [${exchangeName.toUpperCase()}-Proxy] Response ${proxyRes.statusCode} for ${req.url}`);
    },
    onError: (err, req, res) => {
      console.error(`❌ [${exchangeName.toUpperCase()}-Proxy] Error:`, err.message);
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  });
  
  proxy(req, res, next);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'CORS Proxy Server is running',
    port: PORT,
    endpoints: {
      bingx: `http://localhost:${PORT}/bingx`,
      bybit: `http://localhost:${PORT}/bybit`,
      universal: `http://localhost:${PORT}/exchange/{exchangeName}`
    }
  });
});

// Catch all для неопознанных путей
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: 'Use /bingx, /bybit, or /exchange/{exchangeName} endpoints',
    availableEndpoints: [
      '/bingx - Proxy to BingX API',
      '/bybit - Proxy to Bybit API', 
      '/exchange/{exchangeName} - Universal proxy for other exchanges',
      '/health - Health check'
    ]
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 CORS Proxy Server running on http://localhost:${PORT}`);
  console.log(`📡 BingX Proxy: http://localhost:${PORT}/bingx`);
  console.log(`📡 Bybit Proxy: http://localhost:${PORT}/bybit`);
  console.log(`📡 Universal Proxy: http://localhost:${PORT}/exchange/{exchangeName}`);
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