# Система поставщиков данных

Комплексная система для работы с различными поставщиками финансовых данных в режиме реального времени с поддержкой WebSocket соединений.

## 🏗️ Архитектура

### Основные компоненты:

1. **Типы данных** (`src/types/dataProviders.ts`)
   - Определения интерфейсов для всех типов данных
   - Поддержка CCXT Browser, CCXT Server, Custom провайдеров

2. **Store управления** (`src/store/dataProviderStore.ts`)
   - Centralized state management с Zustand
   - Управление WebSocket соединениями
   - Объединение подписок из разных дашбордов

3. **Хуки для использования** (`src/hooks/useDataProvider.ts`)
   - Удобные хуки для работы с данными
   - Автоматическая подписка/отписка
   - Typed интерфейсы

4. **Виджеты**
   - `DataProviderSetupWidget` - настройка поставщиков
   - `DataProviderDebugWidget` - отладка и мониторинг
   - `MarketDataWidget` - пример использования
   - `OrderBookWidget` - специализированный виджет книги заказов
   - `TradesWidget` - специализированный виджет ленты сделок

## 🚀 Быстрый старт

### 1. Настройка поставщика данных

```tsx
import { DataProviderSetupWidget } from './components/widgets/DataProviderSetupWidget';

function App() {
  return (
    <div>
      <DataProviderSetupWidget />
    </div>
  );
}
```

### 2. Использование данных в виджете

```tsx
import { useCandles, useTrades, useOrderBook } from '../hooks/useDataProvider';

function MyTradingWidget() {
  const candles = useCandles('BTC/USDT', 'binance');
  const trades = useTrades('BTC/USDT', 'binance');
  const orderbook = useOrderBook('BTC/USDT', 'binance');

  if (candles.loading) return <div>Загрузка...</div>;
  if (candles.error) return <div>Ошибка: {candles.error}</div>;

  return (
    <div>
      <h3>Последняя цена: {candles.data?.[candles.data.length - 1]?.close}</h3>
      {/* Ваш UI */}
    </div>
  );
}
```

### 3. Специализированные виджеты

```tsx
import { OrderBookWidget } from './components/widgets/OrderBookWidget';
import { TradesWidget } from './components/widgets/TradesWidget';

function TradingDashboard() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Книга заказов */}
      <OrderBookWidget
        initialSymbol="BTC/USDT"
        initialExchange="binance"
        maxDepth={15}
        showSpread={true}
        dashboardId="main-dashboard"
        widgetId="main-orderbook"
      />
      
      {/* Лента сделок */}
      <TradesWidget
        initialSymbol="BTC/USDT"
        initialExchange="binance"
        maxTrades={100}
        showFilters={true}
        dashboardId="main-dashboard"
        widgetId="main-trades"
      />
    </div>
  );
}
```

### 4. Комбинированное использование

```tsx
import { useMarketData } from '../hooks/useDataProvider';

function AdvancedWidget() {
  const marketData = useMarketData(
    'BTC/USDT', 
    'binance', 
    ['candles', 'trades', 'orderbook']
  );

  return (
    <div>
      {marketData.candles && <CandlestickChart data={marketData.candles.data} />}
      {marketData.trades && <TradesList data={marketData.trades.data} />}
      {marketData.orderbook && <OrderBookView data={marketData.orderbook.data} />}
    </div>
  );
}
```

## 📊 Типы данных

### Candle (Свеча)
```typescript
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
```

### Trade (Сделка)
```typescript
interface Trade {
  id: string;
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
}
```

### OrderBook (Книга заказов)
```typescript
interface OrderBook {
  timestamp: number;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

interface OrderBookEntry {
  price: number;
  amount: number;
}
```

## 🔧 Конфигурация поставщиков

All market data and trading go through a `ccxt-server` provider (the browser
CCXT path was removed in Stage 2). The default provider `primary-server` is
created automatically; you rarely construct one by hand.

### CCXT Server
```typescript
const ccxtServerProvider: CCXTServerProvider = {
  id: 'primary-server',
  name: 'Primary Server',
  type: 'ccxt-server',
  status: 'connected',
  exchanges: ['*'],
  priority: 1,
  config: {
    serverUrl: 'http://localhost:3001', // or VITE_SERVER_URL / page origin
    token: 'your-api-token',            // optional
    timeout: 30000,
  }
};
```

## 🎯 Основные хуки

### `useCandles(symbol, exchange, providerId?, dashboardId?, widgetId?)`
- Подписка на данные свечей
- Автоматическое управление подпиской
- Возвращает: `{ data, loading, error, lastUpdate, subscribe, unsubscribe, isSubscribed }`

### `useTrades(symbol, exchange, providerId?, dashboardId?, widgetId?)`
- Подписка на данные сделок
- Аналогичный интерфейс как у `useCandles`

### `useOrderBook(symbol, exchange, providerId?, dashboardId?, widgetId?)`
- Подписка на данные книги заказов
- Аналогичный интерфейс как у `useCandles`

### `useMarketData(symbol, exchange, dataTypes[], providerId?, dashboardId?, widgetId?)`
- Комбинированная подписка на несколько типов данных
- `dataTypes` - массив из `['candles', 'trades', 'orderbook']`
- Возвращает объект с данными по каждому типу

### `useDataProviders()`
- Управление поставщиками данных
- Возвращает: `{ providers, activeProvider, setActiveProvider, addProvider, removeProvider, ... }`

### `useConnectionStats()`
- Статистика WebSocket соединений
- Возвращает: `{ total, connected, connecting, error, connections, subscriptions, ... }`

## 🛠️ Утилиты форматирования

```typescript
import { formatPrice, formatVolume, formatTimestamp } from '../utils/formatters';

// Примеры использования
formatPrice(42567.89);        // "42,567.89"
formatPrice(0.00001234);      // "0.000012"
formatVolume(1234567);        // "1.23M"
formatTimestamp(Date.now());  // "2м назад"
```

## 🔍 Отладка и мониторинг

Используйте `DataProviderDebugWidget` для:
- Просмотра статуса всех поставщиков
- Мониторинга WebSocket соединений
- Отслеживания активных подписок
- Управления соединениями

```tsx
import { DataProviderDebugWidget } from './components/widgets/DataProviderDebugWidget';

function DebugPage() {
  return <DataProviderDebugWidget />;
}
```

## ⚡ Ключевые особенности

1. **Отдельные WebSocket соединения** - Каждая комбинация exchange+symbol+dataType имеет свое WebSocket соединение

2. **Автоматическое переподключение** - Система автоматически переподключается при разрыве соединения

3. **Типобезопасность** - Полная поддержка TypeScript для всех компонентов

4. **Расширяемость** - Легко добавлять новые типы поставщиков данных

5. **Эффективность** - Оптимизированное управление состоянием с Zustand и Immer

6. **Специализированные виджеты**:
   - **OrderBookWidget** - продвинутая книга заказов с совокупными объемами, спредом, настройкой глубины
   - **TradesWidget** - лента сделок с фильтрацией, сортировкой, статистикой и автопрокруткой

## 🐛 Решение проблем

### Соединение не устанавливается
1. Проверьте поддержку WebSocket биржей в CCXT
2. Убедитесь в правильности API ключей (если используются)
3. Проверьте сетевое соединение

### Данные не обновляются
1. Проверьте статус соединения в отладочном виджете
2. Убедитесь что подписка активна (`isSubscribed: true`)
3. Проверьте логи браузера на ошибки

### Производительность
1. Ограничьте количество одновременных подписок
2. Используйте `useMarketData` для объединения типов данных
3. Оптимизируйте рендеринг компонентов

## 🔮 Будущие улучшения

1. **Реализация CCXT Server** - Полная поддержка серверного провайдера
2. **Кастомные провайдеры** - Интерфейс для добавления произвольных API
3. **Кеширование данных** - Локальное кеширование для оффлайн режима
4. **Аналитика** - Встроенная аналитика использования данных
5. **Сжатие данных** - Оптимизация передачи больших объемов данных

## 📝 Примеры виджетов

### OrderBookWidget
Специализированный виджет для отображения книги заказов:
- Настройка глубины (5-50 уровней)
- Расчет совокупных объемов
- Отображение спреда в реальном времени
- Цветовая индикация bid/ask
- Настройки символа и биржи

### TradesWidget  
Продвинутый виджет ленты сделок:
- Фильтрация по стороне сделки (buy/sell)
- Фильтры по цене и объему
- Сортировка по времени, цене, объему
- Статистика по отфильтрованным данным
- Автопрокрутка к новым сделкам
- Настройка лимита отображаемых сделок

### MarketDataWidget
Комплексный виджет с примером интеграции всех типов данных.

---

*Система разработана для максимальной производительности и удобства использования в трейдинг приложениях.* 