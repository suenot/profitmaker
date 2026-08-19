import { describe, expect, it, vi } from 'vitest';
import { cancelAndFlatten } from './emergencyFlattenService';

const baseRequest = {
  exchange: 'binance',
  accountId: 'account-1',
  market: 'futures',
  symbol: 'BTC/USDT:USDT',
  openOrders: [{ id: 'order-1' }],
  maxReconcileAttempts: 8,
  pollIntervalMs: 0,
};

describe('cancelAndFlatten', () => {
  it('closes the updated position when a late fill lands after the cancel acknowledgement', async () => {
    const cancel = vi.fn(async () => ({ success: true }));
    const submit = vi.fn(async () => ({ success: true }));
    const positions = [
      [{ symbol: baseRequest.symbol, side: 'long', contracts: 1 }],
      [{ symbol: baseRequest.symbol, side: 'long', contracts: 2 }],
      [{ symbol: baseRequest.symbol, side: 'long', contracts: 2 }],
      [{ symbol: baseRequest.symbol, side: 'long', contracts: 2 }],
      [],
      [],
      [],
    ];
    const fetchPositions = vi.fn(async () => positions.shift() ?? []);
    const fetchOpenOrders = vi.fn(async () => []);

    const result = await cancelAndFlatten({
      ...baseRequest,
      fetchOpenOrders,
      fetchPositions,
      dependencies: { cancel, submit, sleep: vi.fn(async () => {}) },
    });

    expect(result).toEqual({ success: true, cancelRequests: 1, flattenedContracts: 2 });
    expect(cancel).toHaveBeenCalledWith(
      'order-1',
      baseRequest.symbol,
      baseRequest.exchange,
      baseRequest.accountId,
      baseRequest.market,
    );
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({
      side: 'sell',
      amount: 2,
      reduceOnly: true,
    }));
  });

  it('does not submit a close when reconciliation times out with an open order', async () => {
    const submit = vi.fn(async () => ({ success: true }));

    const result = await cancelAndFlatten({
      ...baseRequest,
      maxReconcileAttempts: 3,
      fetchOpenOrders: vi.fn(async () => [{ id: 'order-1' }]),
      fetchPositions: vi.fn(async () => [{ symbol: baseRequest.symbol, side: 'long', contracts: 1 }]),
      dependencies: {
        cancel: vi.fn(async () => ({ success: true })),
        submit,
        sleep: vi.fn(async () => {}),
      },
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No flatten order was placed');
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not submit a close when the position snapshot is unknown', async () => {
    const submit = vi.fn(async () => ({ success: true }));

    const result = await cancelAndFlatten({
      ...baseRequest,
      maxReconcileAttempts: 3,
      fetchOpenOrders: vi.fn(async () => []),
      fetchPositions: vi.fn(async () => {
        throw new Error('private state unavailable');
      }),
      dependencies: {
        cancel: vi.fn(async () => ({ success: true })),
        submit,
        sleep: vi.fn(async () => {}),
      },
    });

    expect(result).toMatchObject({ success: false, flattenedContracts: 0 });
    expect(result.error).toContain('private state unavailable');
    expect(submit).not.toHaveBeenCalled();
  });

  it('does not submit a close when reconciliation confirms the account is already flat', async () => {
    const submit = vi.fn(async () => ({ success: true }));

    const result = await cancelAndFlatten({
      ...baseRequest,
      openOrders: [],
      fetchOpenOrders: vi.fn(async () => []),
      fetchPositions: vi.fn(async () => []),
      dependencies: {
        cancel: vi.fn(async () => ({ success: true })),
        submit,
        sleep: vi.fn(async () => {}),
      },
    });

    expect(result).toEqual({ success: true, cancelRequests: 0, flattenedContracts: 0 });
    expect(submit).not.toHaveBeenCalled();
  });
});
