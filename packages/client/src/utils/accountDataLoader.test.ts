import { describe, expect, it, vi } from 'vitest';
import { getAccountDataError, getAccountDataIssue, loadAccountData } from './accountDataLoader';

describe('loadAccountData', () => {
  it('starts all account reads without waiting for an earlier account', async () => {
    let releaseFirst: ((value: string) => void) | undefined;
    const first = new Promise<string>((resolve) => {
      releaseFirst = resolve;
    });
    const load = vi.fn((account: string) => account === 'slow' ? first : Promise.resolve('ready'));

    const resultPromise = loadAccountData(['slow', 'fast'], load);
    await Promise.resolve();

    expect(load).toHaveBeenCalledTimes(2);
    releaseFirst?.('done');
    await expect(resultPromise).resolves.toEqual({
      loaded: [
        { account: 'slow', data: 'done' },
        { account: 'fast', data: 'ready' },
      ],
      failures: [],
    });
  });

  it('returns successful account data together with exchange failures', async () => {
    const result = await loadAccountData(['ok', 'blocked'], async (account) => {
      if (account === 'blocked') throw new Error('Unmatched IP');
      return [1, 2];
    });

    expect(result.loaded).toEqual([{ account: 'ok', data: [1, 2] }]);
    expect(result.failures).toHaveLength(1);
    expect(getAccountDataError('trades', result.failures)).toBe(
      'Failed to load trades: Unmatched IP',
    );
  });

  it('publishes successful account data before a slower account settles', async () => {
    let releaseSlow: (() => void) | undefined;
    const slow = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    const progress = vi.fn();

    const resultPromise = loadAccountData(['fast', 'slow'], async (account) => {
      if (account === 'slow') await slow;
      return account === 'fast' ? ['trade'] : [];
    }, progress);

    await vi.waitFor(() => {
      expect(progress).toHaveBeenCalledWith({
        loaded: [{ account: 'fast', data: ['trade'] }],
        failures: [],
      });
    });

    releaseSlow?.();
    await resultPromise;
  });

  it('treats a failed account as a warning when another account succeeded with no rows', () => {
    const issue = getAccountDataIssue('trades', {
      loaded: [{ account: 'working', data: [] }],
      failures: [{ account: 'blocked', error: new Error('Unmatched IP') }],
    });

    expect(issue).toEqual({
      error: null,
      warning: 'Failed to load trades: Unmatched IP',
    });
  });

  it('treats account failures as fatal only when every account failed', () => {
    const issue = getAccountDataIssue('orders', {
      loaded: [],
      failures: [{ account: 'blocked', error: new Error('Invalid key') }],
    });

    expect(issue).toEqual({
      error: 'Failed to load orders: Invalid key',
      warning: null,
    });
  });
});
