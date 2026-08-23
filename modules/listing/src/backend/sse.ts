import type { ModuleListing, SseStatus } from '../shared/types';
import type { FetchLike, ListingApi } from './apiClient';
import type { ListingRing } from './ringBuffer';
import { normalizeStreamEvent } from './normalize';

export interface SseService {
  start(): void;
  stop(): void;
  /** One-shot REST backfill into the ring (call once at startup). */
  backfill(limit?: number): Promise<void>;
  getStatus(): { status: SseStatus; lastEventAt: number | null; lastError: string | null };
}

export interface SseServiceDeps {
  baseUrl: string;
  apiKey: string;
  api: Pick<ListingApi, 'getListings'>;
  ring: ListingRing;
  /** fired only for NEW ids */
  onListing: (listing: ModuleListing) => void;
  /** fired on every status transition */
  onStatus: (status: SseStatus) => void;
  fetchImpl?: FetchLike;
  heartbeatTimeoutMs?: number;
  pollIntervalMs?: number;
  maxBackoffMs?: number;
}

const DEFAULT_HEARTBEAT_TIMEOUT_MS = 45_000;
const DEFAULT_POLL_INTERVAL_MS = 30_000;
const DEFAULT_MAX_BACKOFF_MS = 60_000;
/** Billing failures (HTTP 402) retry slowly: every stream connection is billed. */
const BILLING_RETRY_MS = 300_000;
const POLL_PAGE_SIZE = 10;

/**
 * ListingAPIs SSE client: connect to the public stream, dedup listings through
 * the ring, and degrade to REST polling when the stream keeps failing.
 *
 * Failure ladder: 1st failure -> exponential-backoff reconnect; 2nd and later
 * -> REST polling every `pollIntervalMs` while SSE retries every
 * `maxBackoffMs`. Any traffic on a stream (data frame or heartbeat comment)
 * feeds the watchdog, marks the connection `up`, and resets the ladder.
 */
export function createSseService(deps: SseServiceDeps): SseService {
  const doFetch = deps.fetchImpl ?? fetch;
  const heartbeatTimeoutMs = deps.heartbeatTimeoutMs ?? DEFAULT_HEARTBEAT_TIMEOUT_MS;
  const pollIntervalMs = deps.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxBackoffMs = deps.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;

  let status: SseStatus = 'connecting';
  let failures = 0;
  let lastEventAt: number | null = null;
  let lastError: string | null = null;
  let stopped = false;
  let controller: AbortController | null = null;
  /**
   * Monotonic connection generation. Bumping it invalidates the previously
   * live attempt: its parked read()/catch become no-ops, so one disconnect is
   * counted exactly once even when a watchdog abort makes that read reject.
   */
  let attempt = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function setStatus(next: SseStatus) {
    if (status === next) return;
    status = next;
    deps.onStatus(next);
  }

  function later(ms: number, fn: () => void) {
    if (stopped) return;
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  }

  function clearWatchdog() {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  }

  function resetWatchdog() {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => fail('heartbeat timeout'), heartbeatTimeoutMs);
  }

  function fail(reason: string, billing = false) {
    attempt += 1; // whatever attempt was live is now dead
    if (controller) { controller.abort(); controller = null; }
    clearWatchdog();
    lastError = reason;
    failures += 1;
    // A 402 means the account is out of balance, not a flaky stream — reconnect
    // attempts cost money, so back off at the slow 5-minute cadence instead of
    // the (much faster) backoff cap.
    const retryIn = billing
      ? BILLING_RETRY_MS
      : failures >= 2
        ? maxBackoffMs
        : Math.min(1000 * 2 ** (failures - 1), maxBackoffMs);
    if (failures >= 2) {
      startPolling();
      setStatus('polling');
      later(retryIn, connect); // keep retrying SSE alongside the polls
    } else {
      setStatus('reconnecting');
      later(retryIn, connect);
    }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => { void poll(); }, pollIntervalMs);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  }

  async function poll() {
    try {
      for (const listing of await deps.api.getListings(POLL_PAGE_SIZE)) emitIfNew(listing);
    } catch { /* keep last good state; the next tick retries */ }
  }

  function emitIfNew(listing: ModuleListing) {
    if (!deps.ring.add(listing)) return;
    lastEventAt = Date.now();
    deps.onListing(listing);
  }

  /** Any complete frame — data or heartbeat comment — proves the stream is live. */
  function markUp() {
    if (status === 'up') return;
    failures = 0;
    stopPolling();
    setStatus('up');
  }

  function handleFrame(frame: string) {
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of frame.split('\n')) {
      if (line.startsWith(':')) continue; // heartbeat comment: liveness only, no payload
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    markUp();
    if (event !== 'listing' || dataLines.length === 0) return; // hello and others are ignored
    let raw: unknown;
    try {
      raw = JSON.parse(dataLines.join('\n'));
    } catch {
      return; // malformed payload: skip the frame, keep the stream
    }
    const listing = normalizeStreamEvent(raw);
    if (listing) emitIfNew(listing);
  }

  async function connect() {
    if (stopped) return;
    const myAttempt = ++attempt;
    setStatus(failures >= 2 ? 'polling' : status === 'connecting' ? 'connecting' : 'reconnecting');
    controller = new AbortController();
    try {
      // No `type` filter: the API's non-empty type param is restrictive, so it
      // would exclude New Pair events; widget-side filters handle types instead.
      const res = await doFetch(`${deps.baseUrl}/api/public/stream`, {
        headers: { Authorization: `Bearer ${deps.apiKey}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (myAttempt !== attempt) return; // superseded while fetching
      if (!res.ok || !res.body) {
        fail(`stream HTTP ${res.status}`, res.status === 402);
        return;
      }
      resetWatchdog();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (myAttempt !== attempt) return; // superseded: watchdog/stop already handled it
        if (done) {
          fail('stream ended');
          return;
        }
        resetWatchdog(); // any traffic feeds the watchdog
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          handleFrame(frame);
        }
      }
    } catch (err) {
      if (stopped || myAttempt !== attempt) return; // abort from watchdog/stop: already counted
      fail(err instanceof Error ? err.message : String(err));
    }
  }

  return {
    start() {
      stopped = false;
      void connect();
    },
    stop() {
      stopped = true;
      attempt += 1; // invalidate the live attempt so its teardown stays silent
      controller?.abort();
      controller = null;
      clearWatchdog();
      stopPolling();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
    async backfill(limit = 100) {
      for (const listing of await deps.api.getListings(limit)) deps.ring.add(listing);
    },
    getStatus: () => ({ status, lastEventAt, lastError }),
  };
}
