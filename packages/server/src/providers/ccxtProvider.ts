import type {
  ServerProviderFactory,
  ServerProviderInstance,
  ServerProviderTrading,
  ServerWatchDataType,
  ProviderRequestConfig,
  ExchangeCapabilities,
} from '@profitmaker/types';
import { getCCXTInstance } from '../services/ccxtCache';

const WATCH_METHOD: Record<ServerWatchDataType, string> = {
  ticker: 'watchTicker',
  trades: 'watchTrades',
  orderbook: 'watchOrderBook',
  ohlcv: 'watchOHLCV',
  balance: 'watchBalance',
};

/**
 * Built-in 'ccxt' provider. Thin wrapper over the existing ccxtCache so the
 * default data/trading path is byte-for-byte what it was before the registry
 * (zero behavior change). Other providers (e.g. module-supplied napi bindings)
 * register alongside it via the same factory contract.
 */
function makeCcxtInstance(config: ProviderRequestConfig): ServerProviderInstance {
  // Lazily resolve the cached ccxt instance; one promise per request config.
  const instanceP = getCCXTInstance(config);

  const trading: ServerProviderTrading = {
    async createOrder(symbol, type, side, amount, price, params) {
      const ex = await instanceP;
      return ex.createOrder(symbol, type, side, amount, price, params || {});
    },
    async cancelOrder(orderId, symbol) {
      const ex = await instanceP;
      return ex.cancelOrder(orderId, symbol);
    },
    async fetchMyTrades(symbol, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchMyTrades) return [];
      return ex.fetchMyTrades(symbol, since, limit);
    },
    async fetchOrders(symbol, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchOrders) return [];
      return ex.fetchOrders(symbol, since, limit);
    },
    async fetchOpenOrders(symbol) {
      const ex = await instanceP;
      if (!ex.has?.fetchOpenOrders) return [];
      return ex.fetchOpenOrders(symbol);
    },
    async fetchPositions(symbols) {
      const ex = await instanceP;
      if (!ex.has?.fetchPositions) return [];
      return ex.fetchPositions(symbols);
    },
    async fetchLedger(code, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchLedger) return [];
      return ex.fetchLedger(code, since, limit);
    },
  };

  return {
    async fetchTicker(symbol) {
      return (await instanceP).fetchTicker(symbol);
    },
    async fetchOrderBook(symbol, limit) {
      return (await instanceP).fetchOrderBook(symbol, limit);
    },
    async fetchTrades(symbol, since, limit) {
      return (await instanceP).fetchTrades(symbol, since, limit);
    },
    async fetchOHLCV(symbol, timeframe, since, limit) {
      return (await instanceP).fetchOHLCV(symbol, timeframe, since, limit);
    },
    async fetchBalance() {
      return (await instanceP).fetchBalance();
    },
    async getCapabilities(): Promise<ExchangeCapabilities> {
      const ex = await instanceP;
      return {
        has: ex.has ?? {},
        markets: Object.keys(ex.markets || {}),
        symbols: ex.symbols || [],
        timeframes: ex.timeframes
          ? (Array.isArray(ex.timeframes) ? ex.timeframes : Object.keys(ex.timeframes))
          : [],
        fees: ex.fees || {},
      };
    },
    async getMarket(symbol) {
      const ex = await instanceP;
      return ex.markets?.[symbol] ?? null;
    },
    async watch(dataType, symbol, timeframe) {
      const ex = await instanceP;
      const method = WATCH_METHOD[dataType];
      if (!ex.has?.[method]) throw new Error(`${ex.id} does not support ${method}`);
      if (dataType === 'ohlcv') {
        if (!timeframe) throw new Error('Timeframe is required for OHLCV subscription');
        return ex.watchOHLCV(symbol, timeframe);
      }
      if (dataType === 'balance') return ex.watchBalance();
      return ex[method](symbol);
    },
    supportsWatch(dataType) {
      // Capability is per-instance; resolved when the instance is awaited. We
      // can't synchronously know `has` before loadMarkets, so report true and
      // let watch() throw a precise error if unsupported (matches prior behavior).
      return dataType in WATCH_METHOD;
    },
    trading,
  };
}

export const ccxtProviderFactory: ServerProviderFactory = {
  id: 'ccxt',
  displayName: 'CCXT (built-in)',
  supportedExchanges: '*',
  priority: 100, // low priority so a specialized provider can take precedence
  create: makeCcxtInstance,
};
