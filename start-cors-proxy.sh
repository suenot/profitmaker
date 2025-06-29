#!/bin/bash

echo "🚀 Starting BingX CORS Proxy Server..."

# Завершаем старые процессы proxy если они есть
echo "🧹 Cleaning up old proxy processes..."
pkill -f "node-cors-proxy.cjs" || true

# Запускаем proxy сервер
echo "🔄 Starting new proxy server..."
node node-cors-proxy.cjs &
PROXY_PID=$!

echo "🎯 Proxy PID: $PROXY_PID"

# Ждем немного и проверяем что сервер запустился
sleep 2
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ CORS Proxy Server is running successfully!"
    echo "📡 BingX API Proxy: http://localhost:3001/bingx"
    echo "💚 Health Check: http://localhost:3001/health"
    echo ""
    echo "🔧 To configure CCXT, use: http://localhost:3001/bingx as base URL"
    echo "⏹️  To stop: kill $PROXY_PID or pkill -f node-cors-proxy.cjs"
else
    echo "❌ Failed to start CORS Proxy Server"
    exit 1
fi 