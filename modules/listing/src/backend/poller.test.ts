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

  it('does not clobber fresh data with a late storage restore', async () => {
    const d = makeDeps();
    const stale = { ...TRENDS, metadata: { last_updated: 'stale' } };
    d.storageMap.set('trends', stale);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const slowStorage = {
      // capture the pre-seeded value synchronously, resolve late (after refresh already wrote fresh data)
      get: async <T,>(k: string) => { const v = (d.storageMap.get(k) as T) ?? null; await gate; return v; },
      set: d.storage.set,
    };
    const p = startPoller({ ...d, storage: slowStorage });
    await vi.waitFor(() => expect(p.cache().trends).toEqual(TRENDS));  // fresh data landed first
    expect(p.cache().updatedAt).not.toBeNull();
    release();  // storage.get finally resolves — restore must not overwrite the fresh cache
    await new Promise((r) => setTimeout(r, 10));  // let the restore continuation run
    expect(p.cache().trends).toEqual(TRENDS);  // still fresh, not the stale snapshot
  });

  it('dispose blocks later refresh writes', async () => {
    const d = makeDeps();
    const jobDispose = vi.fn();
    const p = startPoller({ ...d, jobs: { every: () => ({ dispose: jobDispose }) } });
    await vi.waitFor(() => expect(p.cache().trends).toEqual(TRENDS));
    p.dispose();
    expect(jobDispose).toHaveBeenCalled();
    const next = { ...TRENDS, metadata: { last_updated: 'next' } };
    d.api.getTrends.mockResolvedValue(next);
    await p.refresh();  // no-op after dispose
    expect(p.cache().trends).toEqual(TRENDS);  // cache untouched
  });

  it('throws from a direct refresh when the first fetch fails', async () => {
    const d = makeDeps();
    d.api.getStats.mockRejectedValue(new Error('down'));
    const p = startPoller({ ...d, jobs: { every: () => ({ dispose: () => undefined }) } });
    await expect(p.refresh()).rejects.toThrow('down');
    expect(p.cache().trends).toEqual(TRENDS);  // partial data still cached: only the failed slot stays empty
    expect(p.cache().stats).toBeNull();
  });

  /** Freeze the fire-and-forget kickoff refresh so tests drive refresh() directly. */
  function freezeKickoff(d: ReturnType<typeof makeDeps>) {
    const frozen = new Promise<never>(() => {});
    d.api.getTrends.mockReturnValue(frozen);
    d.api.getStats.mockReturnValue(frozen);
    d.api.getExchanges.mockReturnValue(frozen);
  }

  it('caches partial results and reports the failure when one endpoint fails', async () => {
    const d = makeDeps();
    freezeKickoff(d);
    const settled: unknown[] = [];
    const p = startPoller({ ...d, jobs: { every: () => ({ dispose: () => undefined }) }, onSettled: (e) => settled.push(e) });
    d.api.getTrends.mockResolvedValue(TRENDS);
    d.api.getStats.mockRejectedValue(new Error('stats down'));
    d.api.getExchanges.mockResolvedValue(['binance']);
    await expect(p.refresh()).rejects.toThrow('stats down');  // fresh install: the failed slot has nothing to serve
    expect(p.cache().trends).toEqual(TRENDS);          // successes cached despite the sibling outage
    expect(p.cache().exchanges).toEqual(['binance']);
    expect(p.cache().stats).toBeNull();
    expect(settled).toHaveLength(1);                   // failure reported for route error mapping
    expect((settled[0] as Error).message).toBe('stats down');
    expect(d.storageMap.get('trends')).toEqual(TRENDS);  // only successful slots persisted
    expect(d.storageMap.has('stats')).toBe(false);
  });

  it('clears the failure flag only when all three endpoints succeed', async () => {
    const d = makeDeps();
    freezeKickoff(d);
    const settled: unknown[] = [];
    const p = startPoller({ ...d, jobs: { every: () => ({ dispose: () => undefined }) }, onSettled: (e) => settled.push(e) });
    d.api.getTrends.mockResolvedValue(TRENDS);
    d.api.getStats.mockRejectedValueOnce(new Error('flaky')).mockResolvedValue(STATS);
    d.api.getExchanges.mockResolvedValue(['binance']);
    await expect(p.refresh()).rejects.toThrow('flaky');  // partial outage
    await p.refresh();                                   // full recovery
    expect(p.cache().stats).toEqual(STATS);
    expect(settled).toHaveLength(2);
    expect((settled[0] as Error).message).toBe('flaky');
    expect(settled[1]).toBeNull();                       // null == every endpoint succeeded
  });

  it('never leaves a scheduled tick rejection unhandled', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (err: unknown) => unhandled.push(err);
    process.on('unhandledRejection', onUnhandled);
    try {
      const d = makeDeps();
      d.api.getTrends.mockRejectedValue(new Error('down'));
      let tick!: () => void;
      const p = startPoller({ ...d, jobs: { every: (_ms: number, fn: () => void) => { tick = fn; return { dispose: () => undefined }; } } });
      tick();  // scheduled tick on a fresh install with the upstream down
      await new Promise((r) => setTimeout(r, 10));  // let any rejection surface
      expect(unhandled).toEqual([]);
      await expect(p.refresh()).rejects.toThrow('down');  // direct callers still see the failure
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
