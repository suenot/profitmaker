import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createCCXTServerProvider } from './ccxtServerProvider';
import type { CCXTServerProvider } from '../../types/dataProviders';
import type { AccountRef } from '@profitmaker/types';

/**
 * Unit tests for the central-accounts trading path and the public market-data
 * socket. Fully mocked, no network.
 *
 * (1) trading.* sends { config (NO secrets), accountId, want } — want:'trade' for
 *     order ops, want:'read' for private reads.
 * (2) the public market-data WebSocket does NOT authenticate (freeze fix): even
 *     with an SSO token present, connecting NEVER emits `authenticate`.
 */

// A live SSO token is present — proves the socket still doesn't authenticate.
vi.mock('../../services/ssoClient', () => ({
  getSsoToken: () => 'sso-jwt-token',
}));

// Controllable socket.io mock: captures every emit and fires connect/subscribed
// synchronously so connect+subscribe resolve without a real server.
const emitted: Array<{ event: string; payload: unknown }> = [];
let connectCb: (() => void) | undefined;
let subscribedCb: ((d: any) => void) | undefined;

const fakeSocket = {
  connected: false,
  on(event: string, cb: (d?: any) => void) {
    if (event === 'connect') connectCb = cb as () => void;
    if (event === 'subscribed') subscribedCb = cb;
    return this;
  },
  off() {
    return this;
  },
  emit(event: string, payload?: unknown) {
    emitted.push({ event, payload });
    // When a subscribe is sent, ack it so subscribeWebSocket resolves. Defer to a
    // microtask: the code registers its `subscribed` handler in the Promise body
    // that runs right AFTER this emit returns, so acking synchronously here would
    // be lost. queueMicrotask lets that handler attach first.
    if (event === 'subscribe') {
      const p = payload as any;
      queueMicrotask(() => subscribedCb?.({ exchangeId: p.exchangeId, symbol: p.symbol, dataType: p.dataType }));
    }
    return this;
  },
  close() {},
};

vi.mock('socket.io-client', () => ({
  io: () => {
    // Fire connect on next microtask, mirroring socket.io's async connect.
    queueMicrotask(() => {
      fakeSocket.connected = true;
      connectCb?.();
    });
    return fakeSocket;
  },
}));

const makeProvider = (): CCXTServerProvider => ({
  id: 'test-server',
  type: 'ccxt-server',
  name: 'Test Server',
  status: 'connected',
  exchanges: ['*'],
  priority: 1,
  config: { serverUrl: 'http://localhost:3001' },
});

/**
 * Stub fetch to capture the JSON body sent to the server and return a {success,
 * data} envelope so makeRequest resolves. Returns an accessor for the last body.
 */
function stubFetchCapture() {
  const calls: Array<{ url: string; body: any }> = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return { ok: true, status: 200, json: async () => ({ success: true, data: { ok: true } }) };
    }) as unknown as typeof fetch,
  );
  return calls;
}

beforeEach(() => {
  emitted.length = 0;
  connectCb = undefined;
  subscribedCb = undefined;
  fakeSocket.connected = false;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('trading.* sends an accountId reference, not secrets', () => {
  const tradeRef: AccountRef = { accountId: 'cred-1', want: 'trade' };
  const readRef: AccountRef = { accountId: 'cred-1', want: 'read' };

  test('createOrder → want:trade, accountId set, config carries NO secrets', async () => {
    const calls = stubFetchCapture();
    const provider = createCCXTServerProvider(makeProvider());

    await provider.trading.createOrder(tradeRef, {
      exchange: 'binance',
      symbol: 'BTC/USDT',
      type: 'limit',
      side: 'buy',
      amount: 1,
      price: 100,
      market: 'spot',
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/api/exchange/createOrder');
    const body = calls[0].body;
    expect(body.accountId).toBe('cred-1');
    expect(body.want).toBe('trade');
    // op fields preserved
    expect(body).toMatchObject({ symbol: 'BTC/USDT', type: 'limit', side: 'buy', amount: 1, price: 100 });
    // config present for exchange/market context, but WITHOUT any secrets
    expect(body.config).toBeDefined();
    expect(body.config.apiKey).toBeUndefined();
    expect(body.config.secret).toBeUndefined();
    expect(body.config.password).toBeUndefined();
    expect(body.config.exchangeId).toBe('binance');
  });

  test('cancelOrder → want:trade', async () => {
    const calls = stubFetchCapture();
    const provider = createCCXTServerProvider(makeProvider());

    await provider.trading.cancelOrder(tradeRef, 'binance', 'order-9', 'BTC/USDT', 'spot');

    const body = calls[0].body;
    expect(calls[0].url).toContain('/api/exchange/cancelOrder');
    expect(body).toMatchObject({ accountId: 'cred-1', want: 'trade', orderId: 'order-9', symbol: 'BTC/USDT' });
    expect(body.config.apiKey).toBeUndefined();
  });

  test.each([
    ['fetchBalance', (p: any) => p.trading.fetchBalance(readRef, 'binance', 'spot'), '/api/exchange/fetchBalance'],
    ['fetchMyTrades', (p: any) => p.trading.fetchMyTrades(readRef, 'binance', 'BTC/USDT'), '/api/exchange/fetchMyTrades'],
    ['fetchOrders', (p: any) => p.trading.fetchOrders(readRef, 'binance'), '/api/exchange/fetchOrders'],
    ['fetchOpenOrders', (p: any) => p.trading.fetchOpenOrders(readRef, 'binance'), '/api/exchange/fetchOpenOrders'],
    ['fetchPositions', (p: any) => p.trading.fetchPositions(readRef, 'binance'), '/api/exchange/fetchPositions'],
  ])('%s → want:read, accountId set, no secrets', async (_name, call, endpoint) => {
    const calls = stubFetchCapture();
    const provider = createCCXTServerProvider(makeProvider());

    await call(provider);

    const body = calls[0].body;
    expect(calls[0].url).toContain(endpoint);
    expect(body.accountId).toBe('cred-1');
    expect(body.want).toBe('read');
    expect(body.config.apiKey).toBeUndefined();
    expect(body.config.secret).toBeUndefined();
    expect(body.config.password).toBeUndefined();
  });
});

describe('public market-data socket does NOT authenticate (freeze fix)', () => {
  test('connecting + subscribing never emits `authenticate`, even with an SSO token present', async () => {
    const provider = createCCXTServerProvider(makeProvider());

    // Drive the public WS subscribe path (this triggers connectWebSocket).
    await provider.subscribeWebSocket(
      'binance',
      'BTC/USDT',
      'orderbook',
      { providerId: 'test-server', userId: 'public', accountId: 'public', exchangeId: 'binance', marketType: 'spot', ccxtType: 'regular' } as any,
      () => {},
      () => {},
    );

    const events = emitted.map((e) => e.event);
    expect(events).toContain('subscribe'); // it did subscribe to public data
    expect(events).not.toContain('authenticate'); // but NEVER authenticated
  });
});
