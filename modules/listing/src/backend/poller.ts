import type { StatsData, TrendsData } from '../shared/types';

export interface PollerCache { trends: TrendsData | null; stats: StatsData | null; exchanges: string[] | null; updatedAt: number | null; }

export function startPoller(deps: {
  api: { getTrends(): Promise<TrendsData>; getStats(): Promise<StatsData>; getExchanges(): Promise<string[]> };
  jobs: { every(ms: number, fn: () => void | Promise<void>, name?: string): { dispose(): void } };
  storage: { get<T>(k: string): Promise<T | null>; set(k: string, v: unknown): Promise<void> };
  intervalMs?: number;
}): { cache(): PollerCache; refresh(): Promise<void>; dispose(): void } {
  let cache: PollerCache = { trends: null, stats: null, exchanges: null, updatedAt: null };
  let disposed = false;

  void (async () => {   // restore last persisted snapshot from storage
    const [trends, stats, exchanges] = await Promise.all([
      deps.storage.get<TrendsData>('trends'), deps.storage.get<StatsData>('stats'), deps.storage.get<string[]>('exchanges'),
    ]);
    if (!disposed) cache = { trends, stats, exchanges, updatedAt: cache.updatedAt };
  })();

  async function refresh(): Promise<void> {
    if (disposed) return;
    try {
      const [trends, stats, exchanges] = await Promise.all([deps.api.getTrends(), deps.api.getStats(), deps.api.getExchanges()]);
      if (disposed) return;   // disposed mid-flight: keep the last good cache
      cache = { trends, stats, exchanges, updatedAt: Date.now() };
      await Promise.all([deps.storage.set('trends', trends), deps.storage.set('stats', stats), deps.storage.set('exchanges', exchanges)]);
    } catch (err) {
      if (cache.trends === null) throw err;   // first refresh must surface failure
    }
  }

  const job = deps.jobs.every(deps.intervalMs ?? 300_000, () => void refresh(), 'trends-stats');
  void refresh();
  return { cache: () => cache, refresh, dispose: () => { disposed = true; job.dispose(); } };
}
