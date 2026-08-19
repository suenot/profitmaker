import { describe, expect, it, vi } from 'vitest';
import type { PrivateTradingDataEvent } from '@profitmaker/types';
import {
  PrivateTradingSession,
  type PrivateTradingSnapshot,
  type PrivateTradingSubscriptionOptions,
} from './privateTradingStream';

class FakeSocket {
  connected = true;
  readonly emitted: Array<{ event: string; payload: unknown }> = [];
  private readonly listeners = new Map<string, Set<(payload?: unknown) => void>>();

  on(event: string, listener: (payload?: unknown) => void): this {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  off(event: string, listener: (payload?: unknown) => void): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  emit(event: string, payload?: unknown): this {
    this.emitted.push({ event, payload });
    return this;
  }

  disconnect(): this {
    this.connected = false;
    return this;
  }

  serverEmit(event: string, payload?: unknown): void {
    if (event === 'connect') this.connected = true;
    if (event === 'disconnect') this.connected = false;
    for (const listener of this.listeners.get(event) ?? []) listener(payload);
  }
}

const symbol = 'BTC/USDT:USDT';

const streamEvent = (
  dataType: PrivateTradingDataEvent['dataType'],
  data: unknown,
  generation = 1,
  timestamp = Date.now(),
): PrivateTradingDataEvent => ({
  subscriptionId: 'private-1',
  accountId: 'account-1',
  exchangeId: 'binance',
  symbol,
  dataType,
  data,
  source: 'stream',
  generation,
  timestamp,
});

const makeOptions = (overrides: Partial<PrivateTradingSubscriptionOptions> = {}) => {
  const socket = new FakeSocket();
  const snapshots: PrivateTradingSnapshot[] = [];
  const options: PrivateTradingSubscriptionOptions = {
    accountId: 'account-1',
    exchangeId: 'binance',
    symbol,
    market: 'futures',
    fetchOpenOrders: vi.fn(async () => []),
    fetchPositions: vi.fn(async () => []),
    fetchMyTrades: vi.fn(async () => []),
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    fallbackPollMs: 60_000,
    warmupBackfillMs: 0,
    tokenProvider: () => 'sso-token',
    socketUrl: 'http://socket.test',
    socketFactory: () => socket,
    ...overrides,
  };
  return { socket, snapshots, options };
};

const connectAndSubscribe = (socket: FakeSocket, subscriptionId = 'private-1'): void => {
  socket.serverEmit('connect');
  socket.serverEmit('authenticated', { success: true });
  socket.serverEmit('private:subscribed', {
    subscriptionId,
    accountId: 'account-1',
    exchangeId: 'binance',
    symbol,
    generation: 1,
    capabilities: { orders: true, myTrades: true, positions: true },
  });
};

describe('PrivateTradingSession', () => {
  it('uses REST immediately when no SSO identity is available', async () => {
    const snapshots: PrivateTradingSnapshot[] = [];
    const socketFactory = vi.fn();
    const fetchOpenOrders = vi.fn(async () => [{ id: 'rest-order', symbol, status: 'open' }]);
    const session = new PrivateTradingSession({
      ...makeOptions().options,
      tokenProvider: () => undefined,
      socketFactory,
      fetchOpenOrders,
      onSnapshot: (snapshot) => snapshots.push(snapshot),
    });

    session.start();
    await vi.waitFor(() => expect(fetchOpenOrders).toHaveBeenCalledOnce());
    expect(socketFactory).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(snapshots.at(-1)?.openOrders[0]?.id).toBe('rest-order'));
    expect(snapshots.at(-1)?.mode).toBe('rest');
    session.stop();
  });

  it('authenticates without exchange keys and performs a second warmup backfill', async () => {
    const { socket, snapshots, options } = makeOptions();
    const session = new PrivateTradingSession(options);
    session.start();
    connectAndSubscribe(socket);

    await vi.waitFor(() => expect(options.fetchOpenOrders).toHaveBeenCalledTimes(2));
    expect(socket.emitted[0]).toEqual({ event: 'authenticate', payload: { token: 'sso-token' } });
    expect(socket.emitted[1]).toEqual({
      event: 'private:subscribe',
      payload: {
        accountId: 'account-1',
        exchangeId: 'binance',
        symbol,
        market: 'futures',
      },
    });
    expect(JSON.stringify(socket.emitted)).not.toMatch(/apiKey|secret|password/);
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('streaming'));
    session.stop();
  });

  it('replays a terminal stream event over overlapping REST snapshots', async () => {
    const openOrder = { id: 'order-1', symbol, status: 'open', filled: 0 };
    const { socket, snapshots, options } = makeOptions({
      fetchOpenOrders: vi.fn(async () => [openOrder]),
    });
    const session = new PrivateTradingSession(options);
    session.start();
    connectAndSubscribe(socket);
    socket.serverEmit('private:data', streamEvent(
      'orders',
      [{ ...openOrder, status: 'closed', filled: 1, timestamp: Date.now() + 10_000 }],
      1,
      Date.now() + 10_000,
    ));

    await vi.waitFor(() => expect(options.fetchOpenOrders).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('streaming'));
    expect(snapshots.at(-1)?.openOrders).toEqual([]);
    session.stop();
  });

  it('backfills a higher server generation and ignores late old-generation data', async () => {
    const { socket, snapshots, options } = makeOptions();
    const session = new PrivateTradingSession(options);
    session.start();
    connectAndSubscribe(socket);
    await vi.waitFor(() => expect(options.fetchOpenOrders).toHaveBeenCalledTimes(2));

    socket.serverEmit('private:error', {
      subscriptionId: 'private-1',
      accountId: 'account-1',
      dataType: 'myTrades',
      error: 'Private myTrades stream failed',
      fatal: false,
      retryInMs: 1_000,
      generation: 1,
    });
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('rest'));

    socket.serverEmit('private:data', streamEvent(
      'myTrades',
      [{ id: 'new-fill', symbol, timestamp: Date.now() + 1 }],
      2,
      Date.now() + 1,
    ));
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('streaming'));
    expect(snapshots.at(-1)?.myTrades.map((trade) => trade.id)).toContain('new-fill');

    socket.serverEmit('private:data', streamEvent(
      'myTrades',
      [{ id: 'late-old-fill', symbol, timestamp: Date.now() + 2 }],
      1,
      Date.now() + 2,
    ));
    expect(snapshots.at(-1)?.myTrades.map((trade) => trade.id)).not.toContain('late-old-fill');
    session.stop();
  });

  it('reauthenticates, resubscribes and backfills after a Socket.IO reconnect', async () => {
    const { socket, snapshots, options } = makeOptions();
    const session = new PrivateTradingSession(options);
    session.start();
    connectAndSubscribe(socket);
    await vi.waitFor(() => expect(options.fetchOpenOrders).toHaveBeenCalledTimes(2));

    socket.serverEmit('disconnect', 'transport close');
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('rest'));
    const callsBeforeReconnect = vi.mocked(options.fetchOpenOrders).mock.calls.length;

    connectAndSubscribe(socket, 'private-2');
    await vi.waitFor(() => {
      expect(vi.mocked(options.fetchOpenOrders).mock.calls.length).toBeGreaterThanOrEqual(callsBeforeReconnect + 2);
    });
    expect(socket.emitted.filter(({ event }) => event === 'authenticate')).toHaveLength(2);
    expect(socket.emitted.filter(({ event }) => event === 'private:subscribe')).toHaveLength(2);
    await vi.waitFor(() => expect(snapshots.at(-1)?.mode).toBe('streaming'));
    session.stop();
  });
});
