import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(),
}));

vi.mock('../store/dataProviderStore', () => ({
  useDataProviderStore: {
    getState: () => ({
      getProviderForExchange: () => ({ type: 'ccxt-server' }),
    }),
  },
}));

vi.mock('../store/providers/ccxtServerProvider', () => ({
  createCCXTServerProvider: () => ({
    trading: { createOrder: mocks.createOrder },
  }),
}));

const { executeOrder } = await import('./orderExecutionService');

const request = {
  exchange: 'binance',
  accountId: 'account-1',
  market: 'swap',
  symbol: 'BTC/USDT:USDT',
  side: 'buy' as const,
  type: 'limit' as const,
  amount: 0.01,
  price: 50_000,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createOrder.mockResolvedValue({
    id: 'exchange-order-1',
    symbol: request.symbol,
    side: request.side,
    type: request.type,
    amount: request.amount,
    price: request.price,
    status: 'open',
    timestamp: 1,
  });
});

describe('executeOrder client order IDs', () => {
  it('assigns an ID when a direct trading surface omits one', async () => {
    const result = await executeOrder(request);

    const params = mocks.createOrder.mock.calls[0][1].params;
    expect(params.clientOrderId).toMatch(/^[a-z0-9]{32}$/);
    expect(result.order?.clientOrderId).toBe(params.clientOrderId);
  });

  it('preserves a caller ID so an ambiguous retry can reuse it', async () => {
    await executeOrder({ ...request, clientOrderId: 'stable-client-order-id' });

    expect(mocks.createOrder.mock.calls[0][1].params.clientOrderId).toBe('stable-client-order-id');
  });

  it('uses distinct IDs for protective orders', async () => {
    await executeOrder(request, {
      stopLoss: { enabled: true, price: 49_000 },
      takeProfit: { enabled: true, price: 51_000 },
    });

    const ids = mocks.createOrder.mock.calls.map((call) => call[1].params.clientOrderId);
    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
  });
});
