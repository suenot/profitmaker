import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchCredentials: vi.fn(),
  invalidateCredentialCache: vi.fn(),
  getCCXTInstance: vi.fn(),
  releaseCCXTInstance: vi.fn(),
}));

vi.mock('./authAccounts', () => ({
  fetchCredentials: mocks.fetchCredentials,
  invalidateCredentialCache: mocks.invalidateCredentialCache,
}));
vi.mock('./ccxtCache', () => ({
  getCCXTInstance: mocks.getCCXTInstance,
  releaseCCXTInstance: mocks.releaseCCXTInstance,
}));

const {
  activatePrivateSubscription,
  hasPrivateSubscription,
  startPrivateSubscription,
  stopPrivateSubscription,
} = await import('./privateWsSubscriptions');

const pending = () => new Promise<never>(() => {});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.releaseCCXTInstance.mockResolvedValue(undefined);
  mocks.fetchCredentials.mockResolvedValue({
    apiKey: 'SERVER_ONLY_KEY',
    secret: 'SERVER_ONLY_SECRET',
    password: 'SERVER_ONLY_PASSWORD',
  });
});

describe('private websocket subscriptions', () => {
  it('acks before starting account-scoped watchers and never emits credentials', async () => {
    const watchOrders = vi.fn()
      .mockResolvedValueOnce([{ id: 'order-1', status: 'open' }])
      .mockImplementation(pending);
    const watchMyTrades = vi.fn()
      .mockResolvedValueOnce([{ id: 'trade-1', order: 'order-1' }])
      .mockImplementation(pending);
    const runtime = {
      has: { watchOrders: true, watchMyTrades: true, watchPositions: false },
      watchOrders,
      watchMyTrades,
    };
    mocks.getCCXTInstance.mockResolvedValue(runtime);
    const events: unknown[] = [];

    const subscription = await startPrivateSubscription({
      id: 'socket-1:private:account-1',
      socketId: 'socket-1',
      ssoUserId: 'sso-user-1',
      accountId: 'account-1',
      exchangeId: 'binance',
      symbol: 'BTC/USDT:USDT',
      market: 'swap',
      emitData: (_socketId, event) => events.push(event),
      emitError: (_socketId, event) => events.push(event),
      emitHeartbeat: (_socketId, event) => events.push(event),
    });

    expect(watchOrders).not.toHaveBeenCalled();
    expect(watchMyTrades).not.toHaveBeenCalled();
    activatePrivateSubscription(subscription.id);
    await vi.waitFor(() => expect(events).toHaveLength(2));

    expect(watchOrders).toHaveBeenCalledWith('BTC/USDT:USDT', undefined, undefined, {});
    expect(watchMyTrades).toHaveBeenCalledWith('BTC/USDT:USDT', undefined, undefined, {});
    expect(subscription.capabilities).toEqual({ orders: true, myTrades: true, positions: false });
    expect(mocks.fetchCredentials).toHaveBeenCalledWith({
      ssoUserId: 'sso-user-1',
      credentialId: 'account-1',
      want: 'read',
    });
    expect(mocks.getCCXTInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        ccxtType: 'pro',
        userId: expect.stringContaining('sso-user-1:account-1:'),
        apiKey: 'SERVER_ONLY_KEY',
        secret: 'SERVER_ONLY_SECRET',
      }),
      { lease: true },
    );
    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('SERVER_ONLY_KEY');
    expect(serialized).not.toContain('SERVER_ONLY_SECRET');
    expect(serialized).not.toContain('SERVER_ONLY_PASSWORD');

    await stopPrivateSubscription(subscription.id);
    expect(mocks.releaseCCXTInstance).toHaveBeenCalledWith(subscription.runtimeConfig, runtime);
  });

  it('does not watch positions for spot even if the exchange advertises them', async () => {
    const watchPositions = vi.fn();
    mocks.getCCXTInstance.mockResolvedValue({
      has: { watchOrders: false, watchMyTrades: false, watchPositions: true },
      watchPositions,
    });

    const subscription = await startPrivateSubscription({
      id: 'socket-2:private:account-2',
      socketId: 'socket-2',
      ssoUserId: 'sso-user-2',
      accountId: 'account-2',
      exchangeId: 'kraken',
      symbol: 'BTC/USD',
      market: 'spot',
      emitData: vi.fn(),
      emitError: vi.fn(),
      emitHeartbeat: vi.fn(),
    });

    activatePrivateSubscription(subscription.id);
    expect(subscription.capabilities.positions).toBe(false);
    expect(watchPositions).not.toHaveBeenCalled();
    await stopPrivateSubscription(subscription.id);
  });

  it('downgrades NotSupported to a channel-level REST fallback', async () => {
    const unsupported = Object.assign(new Error('orders unavailable SERVER_ONLY_KEY'), { name: 'NotSupported' });
    const emitError = vi.fn();
    mocks.getCCXTInstance.mockResolvedValue({
      has: { watchOrders: true, watchMyTrades: false, watchPositions: false },
      watchOrders: vi.fn().mockRejectedValue(unsupported),
    });
    const subscription = await startPrivateSubscription({
      id: 'socket-3:private:account-3',
      socketId: 'socket-3',
      ssoUserId: 'sso-user-3',
      accountId: 'account-3',
      exchangeId: 'kraken',
      symbol: 'BTC/USD',
      market: 'spot',
      emitData: vi.fn(),
      emitError,
      emitHeartbeat: vi.fn(),
    });

    activatePrivateSubscription(subscription.id);
    await vi.waitFor(() => expect(emitError).toHaveBeenCalled());
    expect(subscription.capabilities.orders).toBe(false);
    expect(emitError).toHaveBeenCalledWith('socket-3', expect.objectContaining({
      dataType: 'orders',
      error: 'Private orders stream unavailable',
      fatal: false,
      unavailable: true,
    }));
    expect(JSON.stringify(emitError.mock.calls)).not.toContain('SERVER_ONLY_KEY');
    expect(hasPrivateSubscription(subscription.id)).toBe(true);
    await stopPrivateSubscription(subscription.id);
  });

  it('refreshes credentials and runtime once after AuthenticationError', async () => {
    vi.useFakeTimers();
    try {
      const authenticationError = Object.assign(new Error('bad key'), { name: 'AuthenticationError' });
      const first = {
        has: { watchOrders: true, watchMyTrades: false, watchPositions: false },
        watchOrders: vi.fn().mockRejectedValue(authenticationError),
      };
      const second = {
        has: { watchOrders: true, watchMyTrades: false, watchPositions: false },
        watchOrders: vi.fn()
          .mockResolvedValueOnce([{ id: 'after-rotation' }])
          .mockImplementation(pending),
      };
      mocks.getCCXTInstance.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
      const emitData = vi.fn();
      const subscription = await startPrivateSubscription({
        id: 'socket-4:private:account-4',
        socketId: 'socket-4',
        ssoUserId: 'sso-user-4',
        accountId: 'account-4',
        exchangeId: 'binance',
        symbol: 'BTC/USDT:USDT',
        market: 'swap',
        emitData,
        emitError: vi.fn(),
        emitHeartbeat: vi.fn(),
      });

      activatePrivateSubscription(subscription.id);
      await vi.advanceTimersByTimeAsync(1_000);
      await vi.waitFor(() => expect(emitData).toHaveBeenCalled(), { timeout: 100 });
      expect(mocks.invalidateCredentialCache).toHaveBeenCalledWith('account-4');
      expect(mocks.getCCXTInstance).toHaveBeenCalledTimes(2);
      expect(emitData).toHaveBeenCalledWith('socket-4', expect.objectContaining({
        data: [{ id: 'after-rotation' }],
      }));
      await stopPrivateSubscription(subscription.id);
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a late event from an old runtime generation after reconnect', async () => {
    let resolveOldTrade: ((value: unknown) => void) | undefined;
    const oldTrade = new Promise((resolve) => {
      resolveOldTrade = resolve;
    });
    const networkError = Object.assign(new Error('disconnected'), { name: 'NetworkError' });
    const first = {
      has: { watchOrders: true, watchMyTrades: true, watchPositions: false },
      watchOrders: vi.fn().mockRejectedValueOnce(networkError).mockImplementation(pending),
      watchMyTrades: vi.fn().mockReturnValueOnce(oldTrade).mockImplementation(pending),
    };
    const second = {
      has: { watchOrders: true, watchMyTrades: true, watchPositions: false },
      watchOrders: vi.fn().mockImplementation(pending),
      watchMyTrades: vi.fn()
        .mockResolvedValueOnce([{ id: 'new-generation' }])
        .mockImplementation(pending),
    };
    mocks.getCCXTInstance.mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const emitData = vi.fn();
    const subscription = await startPrivateSubscription({
      id: 'socket-5:private:account-5',
      socketId: 'socket-5',
      ssoUserId: 'sso-user-5',
      accountId: 'account-5',
      exchangeId: 'binance',
      symbol: 'BTC/USDT:USDT',
      market: 'futures',
      emitData,
      emitError: vi.fn(),
      emitHeartbeat: vi.fn(),
    });

    activatePrivateSubscription(subscription.id);
    await vi.waitFor(() => expect(mocks.getCCXTInstance).toHaveBeenCalledTimes(2));
    resolveOldTrade?.([{ id: 'old-generation' }]);
    await vi.waitFor(() => expect(emitData).toHaveBeenCalled());

    const payloads = emitData.mock.calls.map(([, event]) => event);
    expect(payloads).toEqual([
      expect.objectContaining({
        data: [{ id: 'new-generation' }],
        generation: 2,
        source: 'stream',
      }),
    ]);
    await stopPrivateSubscription(subscription.id);
  });
});
