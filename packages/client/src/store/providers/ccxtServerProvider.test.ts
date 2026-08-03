import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createCCXTServerProvider, deriveSocketUrl } from './ccxtServerProvider';
import type { CCXTServerProvider } from '../../types/dataProviders';

// Socket.IO mock with a real listener registry (so `off` actually detaches) that
// acks `subscribe` with a server-assigned id of the form
// `${socket.id}:${subscriptionKey}` — exactly what the terminal server sends.
const socketEmits: Array<{ event: string; payload: any }> = [];
const socketListeners = new Map<string, Set<(d?: any) => void>>();

const fireSocketEvent = (event: string, payload?: any) => {
  for (const cb of [...(socketListeners.get(event) ?? [])]) cb(payload);
};

const fakeSocket = {
  id: 'sock-1',
  connected: false,
  on(event: string, cb: (d?: any) => void) {
    if (!socketListeners.has(event)) socketListeners.set(event, new Set());
    socketListeners.get(event)!.add(cb);
    return this;
  },
  off(event: string, cb: (d?: any) => void) {
    socketListeners.get(event)?.delete(cb);
    return this;
  },
  emit(event: string, payload?: any) {
    socketEmits.push({ event, payload });
    if (event === 'subscribe') {
      // Defer: the `subscribed` listener is attached in the Promise body that
      // runs right after this emit returns.
      queueMicrotask(() =>
        fireSocketEvent('subscribed', {
          exchangeId: payload.exchangeId,
          symbol: payload.symbol,
          dataType: payload.dataType,
          subscriptionId: `sock-1:${payload.exchangeId}:${payload.symbol}:${payload.dataType}`,
        }),
      );
    }
    return this;
  },
  disconnect() {},
};

vi.mock('socket.io-client', () => ({
  io: () => {
    queueMicrotask(() => {
      fakeSocket.connected = true;
      fireSocketEvent('connect');
    });
    return fakeSocket;
  },
}));

describe('deriveSocketUrl', () => {
  test('uses the next port for explicit local server URLs', () => {
    expect(deriveSocketUrl('http://localhost:3001')).toBe('http://localhost:3002');
    expect(deriveSocketUrl('http://127.0.0.1:4000/')).toBe('http://127.0.0.1:4001');
  });

  test('keeps reverse-proxied URLs without explicit ports unchanged', () => {
    expect(deriveSocketUrl('https://api.profitmaker.cc')).toBe('https://api.profitmaker.cc');
  });

  test('falls back to trimming invalid URLs', () => {
    expect(deriveSocketUrl('not-a-url/')).toBe('not-a-url');
  });
});

// Regression test for the market-data freeze (task #15): the one-shot (no-onData)
// watch* methods must return the orderbook/candles directly. makeRequest already
// unwraps the {success,data} envelope to `data`; the methods previously returned
// `response.data`, double-unwrapping to `undefined` so every poll was discarded
// and the orderbook/chart UI froze after the initial REST seed.
describe('createExchangeProxy one-shot watch* methods (no onData)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const makeProvider = (): CCXTServerProvider => ({
    id: 'test-server',
    type: 'ccxt-server',
    name: 'Test Server',
    status: 'connected',
    exchanges: ['*'],
    priority: 1,
    config: { serverUrl: 'http://localhost:3001' },
  });

  /** Mock fetch: every POST returns a {success,data} envelope wrapping `payload`. */
  const mockFetchReturning = (payload: unknown) => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: payload }),
    })) as unknown as typeof fetch);
  };

  test('watchOrderBook(no onData) returns the unwrapped orderbook, not undefined', async () => {
    const orderbook = { bids: [[64203.99, 1.2]], asks: [[64204.1, 0.8]], timestamp: 1, symbol: 'BTC/USDT' };
    mockFetchReturning(orderbook);

    const provider = createCCXTServerProvider(makeProvider());
    const instance = await provider.getWebSocketInstance('binance', 'spot');
    const result = await instance.watchOrderBook('BTC/USDT');

    expect(result).toBeDefined();
    expect(result).toEqual(orderbook);
    expect(result.bids).toHaveLength(1);
  });

  test('watchOHLCV(no onData) returns the unwrapped candles array', async () => {
    const candles = [[1, 100, 110, 95, 105, 12]];
    mockFetchReturning(candles);

    const provider = createCCXTServerProvider(makeProvider());
    const instance = await provider.getWebSocketInstance('binance', 'spot');
    const result = await instance.watchOHLCV('BTC/USDT', '1m');

    expect(result).toEqual(candles);
    expect(Array.isArray(result)).toBe(true);
  });
});

// Regression test for the subscription leak: the server keys its
// activeSubscriptions by the id IT assigns (`${socket.id}:${subscriptionKey}`).
// The client used to discard that id and emit `unsubscribe` with its own local
// `exchange:symbol:dataType` key, so the server's lookup missed,
// stopWebSocketSubscription no-opped, and the watch loop ran forever — leaking a
// live upstream exchange stream on every symbol change or widget close.
describe('unsubscribe sends the server-assigned subscription id', () => {
  const makeProvider = (): CCXTServerProvider => ({
    id: 'test-server',
    type: 'ccxt-server',
    name: 'Test Server',
    status: 'connected',
    exchanges: ['*'],
    priority: 1,
    config: { serverUrl: 'http://localhost:3001' },
  });

  const LOCAL_KEY = 'binance:BTC/USDT:orderbook';
  const SERVER_ID = `sock-1:${LOCAL_KEY}`;

  const subscribe = async () => {
    const provider = createCCXTServerProvider(makeProvider());
    const id = await provider.subscribeWebSocket(
      'binance',
      'BTC/USDT',
      'orderbook',
      { exchangeId: 'binance', marketType: 'spot', ccxtType: 'pro' } as any,
      () => {},
      () => {},
    );
    return { provider, id };
  };

  const lastUnsubscribe = () => socketEmits.filter((e) => e.event === 'unsubscribe').at(-1);

  beforeEach(() => {
    socketEmits.length = 0;
    socketListeners.clear();
    fakeSocket.connected = false;
  });

  test('subscribeWebSocket resolves with the server id, not the local key', async () => {
    const { id } = await subscribe();

    expect(id).toBe(SERVER_ID);
    expect(id).not.toBe(LOCAL_KEY);
  });

  test('unsubscribing by server id emits that id', async () => {
    const { provider, id } = await subscribe();

    await provider.unsubscribeWebSocket(id);

    expect(lastUnsubscribe()?.payload).toEqual({ subscriptionId: SERVER_ID });
  });

  test('unsubscribing by local key still resolves to the server id', async () => {
    const { provider } = await subscribe();

    // The reverse lookup direction must not silently no-op.
    await provider.unsubscribeWebSocket(LOCAL_KEY);

    expect(lastUnsubscribe()?.payload).toEqual({ subscriptionId: SERVER_ID });
  });

  test('unsubscribe detaches the data handler so it stops firing', async () => {
    const provider = createCCXTServerProvider(makeProvider());
    const received: any[] = [];
    const id = await provider.subscribeWebSocket(
      'binance',
      'BTC/USDT',
      'orderbook',
      { exchangeId: 'binance', marketType: 'spot', ccxtType: 'pro' } as any,
      (d) => received.push(d),
      () => {},
    );

    fireSocketEvent('data', { subscriptionId: SERVER_ID, bids: [] });
    expect(received).toHaveLength(1);

    await provider.unsubscribeWebSocket(id);
    fireSocketEvent('data', { subscriptionId: SERVER_ID, bids: [] });

    expect(received).toHaveLength(1);
  });
});
