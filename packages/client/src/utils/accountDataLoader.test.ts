import { describe, expect, it, vi } from 'vitest';
import { getAccountDataError, loadAccountData } from './accountDataLoader';

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
});
