import type {
  BackendModule,
  BackendModuleContext,
  Disposable,
  ServerProviderFactory,
  ServerProviderInstance,
  ProviderRequestConfig,
  ServerWatchDataType,
  ExchangeCapabilities,
} from '@profitmaker/module-sdk';

/**
 * Example PROVIDER module.
 *
 * Registers a server-side data provider ('mock') with the terminal's provider
 * registry via `ctx.providers.register(...)`. Once registered, the mock provider
 * is resolved by /api/exchange/* and the Socket.IO watch loop just like the
 * built-in 'ccxt' — e.g. `POST /api/exchange/fetchTicker {..., providerId:"mock"}`
 * returns this provider's data, and it appears in GET /api/providers/available.
 *
 * The data here is static/random for illustration. A REAL provider would do the
 * same thing wrapping anything — a REST client, a websocket feed, or a NATIVE
 * binding: ship a Rust implementation compiled to a Node.js napi addon in this
 * module's npm package (`bun add your-native-pkg`), import it here, and adapt it
 * to the ServerProviderInstance shape. Nothing in the contract assumes pure JS.
 */

const SUPPORTED = ['mockex'];

function makeMockInstance(config: ProviderRequestConfig): ServerProviderInstance {
  const basePrice = 100 + (config.exchangeId.length % 7) * 10;
  const jitter = () => basePrice * (1 + (Math.random() - 0.5) * 0.01);

  return {
    async fetchTicker(symbol: string) {
      const bid = jitter();
      const ask = bid * 1.0005;
      return { symbol, timestamp: Date.now(), bid, ask, last: (bid + ask) / 2 };
    },
    async fetchOrderBook(symbol: string, limit = 10) {
      const mid = jitter();
      const bids = Array.from({ length: limit }, (_, i) => [mid - i * 0.1, Math.random()]);
      const asks = Array.from({ length: limit }, (_, i) => [mid + i * 0.1, Math.random()]);
      return { symbol, timestamp: Date.now(), bids, asks };
    },
    async fetchTrades(_symbol: string, _since?: number, limit = 20) {
      return Array.from({ length: limit }, (_, i) => ({
        id: String(Date.now() - i),
        timestamp: Date.now() - i * 1000,
        price: jitter(),
        amount: Math.random(),
        side: Math.random() > 0.5 ? 'buy' : 'sell',
      }));
    },
    async fetchOHLCV(_symbol: string, _timeframe: string, _since?: number, limit = 100) {
      let t = Date.now() - limit * 60_000;
      return Array.from({ length: limit }, () => {
        const o = jitter();
        const c = jitter();
        t += 60_000;
        return [t, o, Math.max(o, c) * 1.001, Math.min(o, c) * 0.999, c, Math.random() * 10];
      });
    },
    async fetchBalance() {
      return { info: {}, USDT: { free: 1000, used: 0, total: 1000 } };
    },
    async getCapabilities(): Promise<ExchangeCapabilities> {
      return {
        has: { fetchTicker: true, fetchOrderBook: true, fetchTrades: true, fetchOHLCV: true, watchTicker: true },
        symbols: ['MOCK/USDT', 'TEST/USDT'],
        markets: ['MOCK/USDT', 'TEST/USDT'],
        timeframes: ['1m', '5m', '1h', '1d'],
        fees: {},
      };
    },
    async getMarket(symbol: string) {
      return { symbol, active: true, type: 'spot', precision: { amount: 1e-5, price: 1e-2 }, limits: {} };
    },
    async watch(dataType: ServerWatchDataType, symbol: string) {
      // One synthetic tick per call; the host loops it.
      await new Promise((r) => setTimeout(r, 250));
      if (dataType === 'ticker') return this.fetchTicker(symbol);
      if (dataType === 'orderbook') return this.fetchOrderBook(symbol);
      if (dataType === 'trades') return this.fetchTrades(symbol);
      throw new Error(`mock provider does not stream '${dataType}'`);
    },
    supportsWatch(dataType: ServerWatchDataType) {
      return dataType === 'ticker' || dataType === 'orderbook' || dataType === 'trades';
    },
    // No `trading` block ⇒ the mock provider is read-only (orders fall back to a
    // clear "no trading support" error).
  };
}

const mockProviderFactory: ServerProviderFactory = {
  id: 'mock',
  displayName: 'Mock Provider (example)',
  supportedExchanges: SUPPORTED,
  priority: 50, // higher priority than built-in ccxt (100) for the exchanges it serves
  create: makeMockInstance,
};

let registration: Disposable | null = null;

const moduleDefinition: BackendModule = {
  async start(ctx: BackendModuleContext) {
    ctx.log.info(`registering mock provider for exchanges: ${SUPPORTED.join(', ')}`);
    // Auto-unregistered by the host on stop()/disable; disposing here is belt-and-braces.
    registration = ctx.providers.register(mockProviderFactory);
  },

  async stop() {
    registration?.dispose();
    registration = null;
  },
};

export default moduleDefinition;
