import { z } from 'zod';
import { defineCommand, type Command } from '../command';

// Market-data endpoints take the exchange/market as a `config` object plus a
// top-level optional providerId (server-side provider selection from #13).
const Instrument = z.object({
  exchange: z.string().describe('Exchange id, e.g. binance, bybit'),
  symbol: z.string().describe('Trading pair, e.g. BTC/USDT'),
  market: z.string().optional().describe('spot | futures | … (default spot)'),
  providerId: z.string().optional().describe('Explicit server provider id (see providers_list_available); omit for the default'),
});
type Instrument = z.infer<typeof Instrument>;

const toConfig = (i: Instrument) => ({ exchangeId: i.exchange, marketType: i.market ?? 'spot' });

export const marketDataCommands: Command[] = [
  defineCommand({
    name: 'marketdata_list_exchanges',
    description: 'List every exchange id the server can serve market data for.',
    input: z.object({}),
    run: async ({ api }) => {
      const r = await api.get('/api/exchange/list');
      return { provider: r.provider, exchanges: r.data };
    },
  }),

  defineCommand({
    name: 'marketdata_get_capabilities',
    description: 'Get an exchange\'s capabilities (which data/trading methods it supports) as reported by the serving provider.',
    input: z.object({ exchange: z.string(), market: z.string().optional(), providerId: z.string().optional() }),
    run: async ({ api }, i) => {
      const r = await api.post('/api/exchange/capabilities', { config: toConfig({ ...i, symbol: '' }), providerId: i.providerId });
      return { provider: r.provider, capabilities: r.data };
    },
  }),

  defineCommand({
    name: 'marketdata_get_candles',
    description: 'Fetch recent OHLCV candles for an instrument. Returns arrays [timestamp, open, high, low, close, volume].',
    input: Instrument.extend({
      timeframe: z.string().optional().describe('e.g. 1m, 5m, 1h, 1d (default 1m)'),
      limit: z.number().optional().describe('Number of candles (default exchange-dependent)'),
    }),
    run: async ({ api }, i) => {
      const r = await api.post('/api/exchange/fetchOHLCV', { config: toConfig(i), symbol: i.symbol, timeframe: i.timeframe, limit: i.limit, providerId: i.providerId });
      return { provider: r.provider, candles: r.data };
    },
  }),

  defineCommand({
    name: 'marketdata_get_orderbook',
    description: 'Fetch the current order book (bids/asks) for an instrument.',
    input: Instrument.extend({ limit: z.number().optional().describe('Depth (levels per side)') }),
    run: async ({ api }, i) => {
      const r = await api.post('/api/exchange/fetchOrderBook', { config: toConfig(i), symbol: i.symbol, limit: i.limit, providerId: i.providerId });
      return { provider: r.provider, orderbook: r.data };
    },
  }),

  defineCommand({
    name: 'marketdata_get_recent_trades',
    description: 'Fetch the most recent public trades for an instrument.',
    input: Instrument.extend({ limit: z.number().optional() }),
    run: async ({ api }, i) => {
      const r = await api.post('/api/exchange/fetchTrades', { config: toConfig(i), symbol: i.symbol, limit: i.limit, providerId: i.providerId });
      return { provider: r.provider, trades: r.data };
    },
  }),

  defineCommand({
    name: 'marketdata_get_ticker',
    description: 'Fetch the latest ticker (last/bid/ask/volume) for an instrument.',
    input: Instrument,
    run: async ({ api }, i) => {
      const r = await api.post('/api/exchange/fetchTicker', { config: toConfig(i), symbol: i.symbol, providerId: i.providerId });
      return { provider: r.provider, ticker: r.data };
    },
  }),
];
