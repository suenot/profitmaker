import { describe, expect, it, vi } from 'vitest';
import { startPoller } from './poller';
import type { StatsData, TrendsData } from '../shared/types';

const TRENDS = { trending_tickers: { last_7_days: [], last_30_days: [] }, trending_exchanges: { last_7_days: [], last_30_days: [] }, metadata: { last_updated: 'x' } } as unknown as TrendsData;
const STATS = { global_stats: { total_listings: 5, total_exchanges: 2, total_tickers: 3, total_pairs: 4, last_updated: 'x' }, activity_stats: {} as never, pair_stats: { most_common_quote_currencies: [] } } as unknown as StatsData;

function makeDeps() {
  const storageMap = new Map<string, unknown>();
  const api = { getTrends: vi.fn(async () => TRENDS), getStats: vi.fn(async () => STATS), getExchanges: vi.fn(async () => ['binance']) };
  const jobs = { every: (_ms: number, fn: () => void) => { fn(); return { dispose: () => undefined }; } };
  const storage = {
    get: async <T,>(k: string) => (storageMap.get(k) as T) ?? null,
    set: async (k: string, v: unknown) => { storageMap.set(k, v); },
  };
  return { api, jobs, storage, storageMap };
}

describe('startPoller', () => {
  it('populates cache and mirrors to storage', async () => {
    const d = makeDeps();
    const p = startPoller(d);
    await vi.waitFor(() => expect(p.cache().trends).toEqual(TRENDS));
    expect(p.cache().stats).toEqual(STATS);
    expect(p.cache().exchanges).toEqual(['binance']);
    expect(d.storageMap.get('trends')).toEqual(TRENDS);
  });

  it('keeps last good cache when refresh fails', async () => {
    const d = makeDeps();
    const p = startPoller(d);
    await vi.waitFor(() => expect(p.cache().trends).not.toBeNull());
    d.api.getTrends.mockRejectedValue(new Error('boom'));
    await p.refresh();  // must not throw
    expect(p.cache().trends).toEqual(TRENDS);
  });

  it('restores cache from storage', async () => {
    const d = makeDeps();
    d.storageMap.set('trends', TRENDS);
    const pending = new Promise<never>(() => {});  // api hangs: only storage can populate the cache
    d.api.getTrends.mockReturnValue(pending);
    d.api.getStats.mockReturnValue(pending);
    d.api.getExchanges.mockReturnValue(pending);
    const p = startPoller({ ...d, jobs: { every: () => ({ dispose: () => undefined }) } });
    await vi.waitFor(() => expect(p.cache().trends).toEqual(TRENDS));
    expect(p.cache().updatedAt).toBeNull();  // restore preserves updatedAt; only refresh sets it
  });
});
