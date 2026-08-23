import type { StatsData, TrendsData } from '../shared/types';

export interface PollerCache { trends: TrendsData | null; stats: StatsData | null; exchanges: string[] | null; updatedAt: number | null; }

export function startPoller(deps: {
  api: { getTrends(): Promise<TrendsData>; getStats(): Promise<StatsData>; getExchanges(): Promise<string[]> };
  jobs: { every(ms: number, fn: () => void | Promise<void>, name?: string): { dispose(): void } };
  storage: { get<T>(k: string): Promise<T | null>; set(k: string, v: unknown): Promise<void> };
  intervalMs?: number;
  /**
   * Aggregate outcome of every refresh: null only when trends, stats AND
   * exchanges all succeeded; otherwise the first failure's error. The module
   * wires this to its routes' error mapping — per-endpoint tracking would let a
   * later-settling success clear a sibling endpoint's failure.
   */
  onSettled?(err: unknown): void;
}): { cache(): PollerCache; refresh(): Promise<void>; dispose(): void } {
  let cache: PollerCache = { trends: null, stats: null, exchanges: null, updatedAt: null };
  let disposed = false;

  void (async () => {   // restore last persisted snapshot from storage
    const [trends, stats, exchanges] = await Promise.all([
      deps.storage.get<TrendsData>('trends'), deps.storage.get<StatsData>('stats'), deps.storage.get<string[]>('exchanges'),
    ]);
    // apply only while no fresh data has landed: a refresh that beat slow storage must not be clobbered
    if (!disposed && cache.updatedAt === null) cache = { trends, stats, exchanges, updatedAt: null };
  })();

  /**
   * Fetch the three endpoints independently: a partial outage caches whatever
   * succeeded (those routes keep serving 200 with data) and reports the failure
   * through onSettled, instead of discarding every result like Promise.all did.
   */
  async function refresh(): Promise<void> {
    if (disposed) return;
    const [trends, stats, exchanges] = await Promise.allSettled([
      deps.api.getTrends(), deps.api.getStats(), deps.api.getExchanges(),
    ]);
    if (disposed) return;   // disposed mid-flight: keep the last good cache
    const next: PollerCache = { ...cache };   // failed slots keep their last good value
    const writes: Promise<void>[] = [];
    let firstError: unknown = null;
    let anySuccess = false;
    if (trends.status === 'fulfilled') {
      next.trends = trends.value; anySuccess = true;
      writes.push(deps.storage.set('trends', trends.value));
    } else firstError ??= trends.reason;
    if (stats.status === 'fulfilled') {
      next.stats = stats.value; anySuccess = true;
      writes.push(deps.storage.set('stats', stats.value));
    } else firstError ??= stats.reason;
    if (exchanges.status === 'fulfilled') {
      next.exchanges = exchanges.value; anySuccess = true;
      writes.push(deps.storage.set('exchanges', exchanges.value));
    } else firstError ??= exchanges.reason;
    if (anySuccess) next.updatedAt = Date.now();
    cache = next;
    deps.onSettled?.(firstError);
    await Promise.all(writes);
    // Surface a failure to direct callers only while some route has nothing to
    // serve (a failed slot with no last-good value); failures fully covered by
    // cached data stay silent so serving from cache does not read as an error.
    if (firstError !== null && (next.trends === null || next.stats === null || next.exchanges === null)) throw firstError;
  }

  // A scheduled tick must never produce an unhandled rejection: the host has no
  // unhandledRejection handler, so a fresh install with the upstream down would
  // otherwise take the process down. Direct refresh() callers still see failures.
  const job = deps.jobs.every(deps.intervalMs ?? 300_000, () => { refresh().catch(() => {}); }, 'trends-stats');
  refresh().catch(() => {});   // fire-and-forget kickoff
  return { cache: () => cache, refresh, dispose: () => { disposed = true; job.dispose(); } };
}
