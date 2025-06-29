# BingX CORS Proxy Server

## Проблема
BingX API не поддерживает CORS (Cross-Origin Resource Sharing), поэтому браузер блокирует прямые запросы к API.

## Решение
Локальный CORS proxy сервер, который:
- Принимает запросы от браузера
- Переадресует их к BingX API
- Добавляет необходимые CORS заголовки в ответы

## Файлы
- `node-cors-proxy.cjs` - основной proxy сервер (Node.js HTTP)
- `start-cors-proxy.sh` - скрипт для запуска proxy
- `CORS-PROXY-README.md` - данная инструкция

## Быстрый запуск

### 1. Запуск proxy сервера
```bash
# Вариант 1: Автоматический запуск
./start-cors-proxy.sh

# Вариант 2: Ручной запуск  
node node-cors-proxy.cjs &
```

### 2. Проверка работы
```bash
# Health check
curl http://localhost:3001/health

# Тестовый запрос к BingX
curl http://localhost:3001/bingx/openApi/spot/v1/common/symbols
```

### 3. Остановка proxy
```bash
# Найти процесс и завершить
pkill -f node-cors-proxy.cjs

# Или по PID (показывается при запуске)
kill <PID>
```

## Endpoints

- **Health Check**: `http://localhost:3001/health`
- **BingX API Proxy**: `http://localhost:3001/bingx/*`
  - Примеры:
    - `http://localhost:3001/bingx/openApi/spot/v1/common/symbols`
    - `http://localhost:3001/bingx/openApi/spot/v1/account`

## Настройка CCXT

В коде проекта CCXT уже настроен для использования proxy:

```javascript
// src/store/utils/ccxtAccountManager.ts
if (config.exchange === 'bingx') {
  instanceConfig.urls = {
    api: {
      public: 'http://localhost:3001/bingx',
      private: 'http://localhost:3001/bingx'
    }
  };
}
```

## Логи

Proxy сервер выводит подробные логи:
- `🔄 [BingX-Proxy] GET https://open-api.bingx.com/openApi/spot/v1/common/symbols`
- `✅ [BingX-Proxy] Response 200`
- `❌ [BingX-Proxy] Error: connect ENOTFOUND ...`

## Troubleshooting

### Proxy не запускается
- Проверьте что порт 3001 свободен: `lsof -i :3001`
- Завершите процессы: `pkill -f node-cors-proxy`

### CORS ошибки остались
- Убедитесь что proxy запущен: `curl http://localhost:3001/health`
- Перезагрузите страницу браузера
- Проверьте Network tab в DevTools

### BingX API недоступен
- Проверьте интернет соединение
- Попробуйте прямой запрос: `curl https://open-api.bingx.com/openApi/spot/v1/common/symbols`
- Возможны временные проблемы с BingX API

## Альтернативы

Если локальный proxy не подходит:

1. **Отключение CORS в браузере** (только для разработки):
   ```bash
   # Chrome
   open -n -a "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome_dev
   ```

2. **Публичный CORS proxy** (менее надежно):
   - `https://cors-anywhere.herokuapp.com/` 
   - `https://api.allorigins.win/get?url=`

3. **Backend proxy** (для production):
   - Настроить proxy на вашем backend сервере
   - Использовать Cloudflare Workers
   - Nginx reverse proxy 