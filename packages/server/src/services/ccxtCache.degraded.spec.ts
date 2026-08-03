import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Degraded-instance caching, i.e. what happens when loadMarkets() fails.
 *
 * Two opposing failure modes are being held apart here, which is why this has
 * its own file (it mocks the ccxt module wholesale, so it cannot share the
 * exchange list with ccxtCache.spec.ts):
 *
 *  - Cache a failed load for the normal 24h TTL → one network blip serves empty
 *    symbol discovery for a day (getCapabilities/getMarket read ex.markets and
 *    ex.symbols directly).
 *  - Don't cache it at all → an unreachable exchange turns every inbound
 *    request into a fresh ccxt construction plus a fresh loadMarkets attempt
 *    against a dead endpoint, converting their outage into ours.
 *
 * The resolution is a short DEGRADED_CACHE_TTL: cached (so it's not an
 * amplifier) but expiring in seconds (so recovery is quick).
 */

const h = vi.hoisted(() => ({ constructed: 0 }));

vi.mock('ccxt', () => {
  class UnreachableExchange {
    id = 'fakeex';
    has: Record<string, boolean> = {};
    markets: Record<string, unknown> = {};
    symbols: string[] = [];

    constructor(_config: unknown) {
      h.constructed += 1;
    }

    async loadMarkets(): Promise<never> {
      throw new Error('getaddrinfo ENOTFOUND fakeex.example');
    }

    async close(): Promise<void> {}
  }

  return { default: { exchanges: ['fakeex'], fakeex: UnreachableExchange, pro: {} } };
});

const { getCCXTInstance } = await import('./ccxtCache');

// The instance cache is module-level, so each test uses its own credentials to
// get its own cache key rather than leaking state into the next one.
const cfg = (tag: string) => ({
  exchangeId: 'fakeex',
  marketType: 'spot',
  ccxtType: 'regular' as const,
  apiKey: `key-${tag}`,
  secret: `secret-${tag}`,
});

describe('getCCXTInstance — failed loadMarkets', () => {
  beforeEach(() => {
    h.constructed = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('still returns a usable instance', async () => {
    const instance = await getCCXTInstance(cfg('usable'));

    expect(instance).toBeDefined();
    expect(instance.id).toBe('fakeex');
  });

  it('caches it, so a dead exchange is not an instance-per-request amplifier', async () => {
    const first = await getCCXTInstance(cfg('amplifier'));
    const second = await getCCXTInstance(cfg('amplifier'));

    expect(second).toBe(first);
    expect(h.constructed).toBe(1);
  });

  it('expires it in seconds rather than the healthy 24h TTL', async () => {
    const first = await getCCXTInstance(cfg('ttl'));

    // Still inside the degraded window: same instance, no rebuild.
    vi.setSystemTime(Date.now() + 29_000);
    expect(await getCCXTInstance(cfg('ttl'))).toBe(first);
    expect(h.constructed).toBe(1);

    // Past it: rebuilt, so symbol discovery recovers as soon as the exchange
    // does. Under the healthy 24h TTL this would still be the stale instance.
    vi.setSystemTime(Date.now() + 2_000);
    const rebuilt = await getCCXTInstance(cfg('ttl'));
    expect(rebuilt).not.toBe(first);
    expect(h.constructed).toBe(2);
  });
});
