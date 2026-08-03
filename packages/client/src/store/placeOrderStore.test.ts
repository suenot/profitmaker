import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePlaceOrderStore } from './placeOrderStore';
import type { ExtendedOrderValidationRules } from './placeOrderStore';

const mocks = vi.hoisted(() => ({
  executeOrder: vi.fn(),
  getGroupById: vi.fn(),
}));

vi.mock('./groupStore', () => ({
  useGroupStore: { getState: () => ({ getGroupById: mocks.getGroupById }) },
}));

vi.mock('../services/orderExecutionService', () => ({
  executeOrder: mocks.executeOrder,
}));

const WIDGET = 'test-widget';

/**
 * A realistic BTC/USDT spot market: 0.0001 BTC lot, 0.01 USDT tick, 10 USDT
 * minimum notional. The account holds 100,000 USDT and 2 BTC.
 */
function makeRules(overrides: Partial<ExtendedOrderValidationRules> = {}): ExtendedOrderValidationRules {
  return {
    symbol: {
      minNotional: 10,
      minQty: 0.0001,
      maxQty: 1000,
      stepSize: 0.0001,
      tickSize: 0.01,
      maxPrice: 1000000,
      minPrice: 0.01,
    },
    balance: {
      available: 100000,
      currency: 'USDT',
      baseAvailable: 2,
      baseCurrency: 'BTC',
    },
    balanceLoaded: true,
    marketPrice: 87000,
    ...overrides,
  };
}

function setup(
  form: { amount: number; type?: 'market' | 'limit'; price?: number } = { amount: 0.01 },
  rules: ExtendedOrderValidationRules | null = makeRules(),
) {
  const store = usePlaceOrderStore.getState();
  store.initializeWidget(WIDGET, 'group-1');
  if (rules) store.updateValidationRules(WIDGET, rules);
  usePlaceOrderStore.getState().updateFormData(WIDGET, {
    symbol: 'BTC/USDT',
    type: form.type ?? 'market',
    amount: form.amount,
    price: form.price,
  });
  return usePlaceOrderStore.getState();
}

const messages = (errors: { message: string }[]) => errors.map(e => e.message).join(' | ');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getGroupById.mockReturnValue({
    account: 'acc-1',
    exchange: 'binance',
    market: 'spot',
    tradingPair: 'BTC/USDT',
  });
  mocks.executeOrder.mockResolvedValue({ success: true, orderId: 'order-1' });
  usePlaceOrderStore.setState({ widgets: {} });
});

describe('validateOrder — per-side balance', () => {
  it('lets a BUY spend the quote balance', async () => {
    // 0.01 BTC * 87,000 = 870 USDT against 100,000 USDT available.
    const errors = await setup({ amount: 0.01 }).validateOrder(WIDGET, 'buy');
    expect(errors).toEqual([]);
  });

  it('blocks a BUY that exceeds the quote balance', async () => {
    // 2 BTC * 87,000 = 174,000 USDT against 100,000 USDT available.
    const errors = await setup({ amount: 2 }).validateOrder(WIDGET, 'buy');
    expect(messages(errors)).toContain('Insufficient USDT');
  });

  it('lets a SELL of held base through even with ZERO quote balance', async () => {
    // The regression this guards: the sell was checked against the quote
    // balance, so selling 1 BTC you own was blocked whenever USDT was empty.
    const rules = makeRules({
      balance: { available: 0, currency: 'USDT', baseAvailable: 2, baseCurrency: 'BTC' },
    });
    const errors = await setup({ amount: 1 }, rules).validateOrder(WIDGET, 'sell');
    expect(errors).toEqual([]);
  });

  it('blocks a SELL larger than the base holding, however much quote is available', async () => {
    // The mirror image: 100,000 USDT used to "cover" a sell of 1 BTC when the
    // account held only 0.001 BTC.
    const rules = makeRules({
      balance: { available: 100000, currency: 'USDT', baseAvailable: 0.001, baseCurrency: 'BTC' },
    });
    const errors = await setup({ amount: 1 }, rules).validateOrder(WIDGET, 'sell');
    expect(messages(errors)).toContain('Insufficient BTC');
  });

  it('treats an unknown base holding as zero once balances have loaded', async () => {
    const rules = makeRules({ balance: { available: 100000, currency: 'USDT' } });
    const errors = await setup({ amount: 1 }, rules).validateOrder(WIDGET, 'sell');
    expect(messages(errors)).toContain('Insufficient');
  });

  it('does not enforce balances before they have loaded', async () => {
    const rules = makeRules({
      balanceLoaded: false,
      balance: { available: 0, currency: 'USDT', baseAvailable: 0, baseCurrency: 'BTC' },
    });
    const errors = await setup({ amount: 0.01 }, rules).validateOrder(WIDGET, 'buy');
    expect(errors).toEqual([]);
  });

  it('validates the side it is given, not the side sitting in the form', async () => {
    const rules = makeRules({
      balance: { available: 0, currency: 'USDT', baseAvailable: 2, baseCurrency: 'BTC' },
    });
    const store = setup({ amount: 1 }, rules);
    // formData.side is 'buy' (the default) and there is no quote to spend.
    expect(messages(await store.validateOrder(WIDGET, 'buy'))).toContain('Insufficient USDT');
    expect(await store.validateOrder(WIDGET, 'sell')).toEqual([]);
  });
});

describe('validateOrder — minimum notional', () => {
  it('rejects an order below the exchange minimum notional', async () => {
    // 0.0001 BTC * 87,000 = 8.70 USDT, under the 10 USDT floor.
    const errors = await setup({ amount: 0.0001 }).validateOrder(WIDGET, 'buy');
    expect(messages(errors)).toContain('below the 10 USDT minimum');
  });

  it('accepts an order that clears the minimum notional', async () => {
    // 0.0002 BTC * 87,000 = 17.40 USDT.
    const errors = await setup({ amount: 0.0002 }).validateOrder(WIDGET, 'buy');
    expect(errors).toEqual([]);
  });

  it('uses the limit price, not the ticker, for a limit order', async () => {
    // 0.0002 BTC * 40,000 = 8 USDT: clears the floor at the ticker price but
    // not at the price actually being bid.
    const errors = await setup({ amount: 0.0002, type: 'limit', price: 40000 })
      .validateOrder(WIDGET, 'buy');
    expect(messages(errors)).toContain('below the 10 USDT minimum');
  });
});

describe('validateOrder — missing market data', () => {
  it('refuses to validate without market constraints', async () => {
    const errors = await setup({ amount: 0.01 }, null).validateOrder(WIDGET, 'buy');
    expect(messages(errors)).toContain('Market data unavailable');
  });

  it('refuses to size a market order with no live price', async () => {
    // Previously this fell back to constraints.maxPrice || 1, which valued a
    // 10 BTC order at 10 USDT and let it through.
    const rules = makeRules({ marketPrice: undefined });
    const errors = await setup({ amount: 10 }, rules).validateOrder(WIDGET, 'buy');
    expect(messages(errors)).toContain('No live market price');
  });

  it('still validates a limit order with no live price', async () => {
    const rules = makeRules({ marketPrice: undefined });
    const errors = await setup({ amount: 0.01, type: 'limit', price: 87000 }, rules)
      .validateOrder(WIDGET, 'buy');
    expect(errors).toEqual([]);
  });
});

describe('placeOrder — submit safety', () => {
  it('places exactly one order when clicked twice in the same tick', async () => {
    let release: (value: unknown) => void = () => {};
    mocks.executeOrder.mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );

    const store = setup({ amount: 0.01 });
    const first = store.placeOrder(WIDGET, 'buy');
    const second = await store.placeOrder(WIDGET, 'buy');

    expect(second.success).toBe(false);
    expect(second.error).toContain('already being submitted');

    // Let the first submission reach the exchange call before releasing it.
    await vi.waitFor(() => expect(mocks.executeOrder).toHaveBeenCalled());
    release({ success: true, orderId: 'order-1' });
    await first;

    expect(mocks.executeOrder).toHaveBeenCalledTimes(1);
  });

  it('sends the side it was given, not a side written by a later click', async () => {
    const store = setup({ amount: 0.01 });
    // The form's own side is 'buy'; the click being executed is a sell.
    await store.placeOrder(WIDGET, 'sell');
    expect(mocks.executeOrder.mock.calls[0][0].side).toBe('sell');
  });

  it('attaches a fresh idempotency key to every attempt', async () => {
    const store = setup({ amount: 0.01 });
    await store.placeOrder(WIDGET, 'buy');
    setup({ amount: 0.01 });
    await usePlaceOrderStore.getState().placeOrder(WIDGET, 'buy');

    const [first, second] = mocks.executeOrder.mock.calls.map(c => c[0].clientOrderId);
    expect(first).toMatch(/^[a-z0-9]{32}$/);
    expect(second).toMatch(/^[a-z0-9]{32}$/);
    expect(first).not.toBe(second);
  });

  it('reuses a caller-supplied key so a retry cannot double-fill', async () => {
    const store = setup({ amount: 0.01 });
    await store.placeOrder(WIDGET, 'buy', 'fixed-key-123');
    expect(mocks.executeOrder.mock.calls[0][0].clientOrderId).toBe('fixed-key-123');
  });

  it('refuses to submit without market constraints', async () => {
    const store = setup({ amount: 0.01 }, null);
    const response = await store.placeOrder(WIDGET, 'buy');
    expect(response.success).toBe(false);
    expect(mocks.executeOrder).not.toHaveBeenCalled();
  });
});

describe('placeOrder — grid rounding', () => {
  it('floors the amount onto the lot grid before sending', async () => {
    const store = setup({ amount: 0.123456789 });
    await store.placeOrder(WIDGET, 'buy');
    // Never 0.1235: rounding a size up trades more than the user asked for.
    expect(mocks.executeOrder.mock.calls[0][0].amount).toBe(0.1234);
  });

  it('floors a BUY limit price and ceils a SELL limit price', async () => {
    setup({ amount: 0.01, type: 'limit', price: 87000.126 });
    await usePlaceOrderStore.getState().placeOrder(WIDGET, 'buy');
    expect(mocks.executeOrder.mock.calls[0][0].price).toBe(87000.12);

    setup({ amount: 0.01, type: 'limit', price: 87000.126 });
    await usePlaceOrderStore.getState().placeOrder(WIDGET, 'sell');
    expect(mocks.executeOrder.mock.calls[1][0].price).toBe(87000.13);
  });

  it('strips accumulated stepper noise from the submitted amount', async () => {
    const store = setup({ amount: 0.1 + 0.1 + 0.1 });
    await store.placeOrder(WIDGET, 'buy');
    expect(mocks.executeOrder.mock.calls[0][0].amount).toBe(0.3);
  });

  it('blocks an order that rounding pushes under the minimum notional', async () => {
    // 0.000115 BTC * 87,000 = 10.005 USDT and clears the floor — but the lot
    // grid floors it to 0.0001 BTC, worth 8.70 USDT, which does not.
    const store = setup({ amount: 0.000115 });
    const response = await store.placeOrder(WIDGET, 'buy');

    expect(response.success).toBe(false);
    expect(response.error).toContain('below the 10 USDT minimum');
    expect(mocks.executeOrder).not.toHaveBeenCalled();
  });

  it('ignores a step that is really a digit count', async () => {
    // Bitfinex reports precision.amount = 8. Rounding 0.5 BTC to a "step" of 8
    // would floor it to zero; the amount must pass through untouched instead.
    const rules = makeRules({
      symbol: { ...makeRules().symbol, stepSize: 8, tickSize: 5 },
    });
    const store = setup({ amount: 0.5 }, rules);
    await store.placeOrder(WIDGET, 'buy');
    expect(mocks.executeOrder.mock.calls[0][0].amount).toBe(0.5);
  });
});
