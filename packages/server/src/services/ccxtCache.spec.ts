import { describe, it, expect } from 'vitest';
import {
  canonicalExchangeId,
  createCacheKey,
  getCCXTInstance,
  type CCXTInstanceConfig,
} from './ccxtCache';

/**
 * Unit tests for the ccxt instance cache key.
 *
 * These are the regression guard for a credential-hijack bug: createCacheKey
 * used to key authenticated instances on `apiKey.substring(0, 8)` and ignore
 * the secret entirely, so ANY caller who supplied a matching 8-char prefix (with
 * a junk secret) was handed back the cached instance belonging to whoever got
 * there first — carrying that user's real credentials. Reachable unauthenticated
 * over the Socket.IO `subscribe` handler with `dataType: 'balance'`.
 *
 * Nothing here touches the network: every assertion is on the key string, and
 * the getCCXTInstance cases reject during validation, before any exchange is
 * constructed.
 */

const base: CCXTInstanceConfig = {
  exchangeId: 'binance',
  marketType: 'spot',
  ccxtType: 'regular',
};

describe('createCacheKey — credential isolation', () => {
  it('does NOT collide for distinct credentials sharing an 8-char prefix', () => {
    // Both keys start with the same 8 chars ('AKIAJ7QX'), which is exactly what
    // the old substring(0, 8) key hashed on.
    const victim = createCacheKey({ ...base, apiKey: 'AKIAJ7QX-victim-key', secret: 'victim-secret' });
    const attacker = createCacheKey({ ...base, apiKey: 'AKIAJ7QX-attacker-key', secret: 'attacker-secret' });

    expect(victim).not.toBe(attacker);
  });

  it('does NOT collide when the apiKey is identical but the secret differs', () => {
    // The sharpest form of the bug: the secret was not part of the key at all,
    // so presenting a known apiKey with a junk secret hit the cached instance.
    const real = createCacheKey({ ...base, apiKey: 'same-api-key', secret: 'real-secret' });
    const forged = createCacheKey({ ...base, apiKey: 'same-api-key', secret: 'junk' });

    expect(real).not.toBe(forged);
  });

  it('does NOT collide when only the password differs', () => {
    const a = createCacheKey({ ...base, apiKey: 'k', secret: 's', password: 'pass-a' });
    const b = createCacheKey({ ...base, apiKey: 'k', secret: 's', password: 'pass-b' });

    expect(a).not.toBe(b);
  });

  it('does NOT collide across credential field boundaries', () => {
    // ('ab','c') vs ('a','bc') must differ — guards the length-prefixing in the
    // fingerprint against a naive concatenation.
    const a = createCacheKey({ ...base, apiKey: 'ab', secret: 'c' });
    const b = createCacheKey({ ...base, apiKey: 'a', secret: 'bc' });

    expect(a).not.toBe(b);
  });

  it('namespaces authenticated instances by user id', () => {
    const creds = { apiKey: 'shared-key', secret: 'shared-secret' };
    const alice = createCacheKey({ ...base, ...creds, userId: 'user-alice' });
    const bob = createCacheKey({ ...base, ...creds, userId: 'user-bob' });

    expect(alice).not.toBe(bob);
  });

  it('leaks no fragment of the credentials into the key', () => {
    const apiKey = 'AKIAJ7QX-victim-key';
    const secret = 'super-secret-value';
    const password = 'trading-passphrase';
    const key = createCacheKey({ ...base, apiKey, secret, password, userId: 'u1' });

    expect(key).not.toContain(secret);
    expect(key).not.toContain(password);
    expect(key).not.toContain(apiKey);
    // Not even the 8-char prefix the old implementation embedded verbatim.
    expect(key).not.toContain(apiKey.substring(0, 8));
  });
});

describe('createCacheKey — legitimate reuse still works', () => {
  it('is stable for the same full credential tuple and user', () => {
    const config: CCXTInstanceConfig = { ...base, apiKey: 'k', secret: 's', userId: 'u1' };

    expect(createCacheKey(config)).toBe(createCacheKey({ ...config }));
  });

  it('shares one entry for credential-less public market data', () => {
    expect(createCacheKey(base)).toBe(createCacheKey({ ...base }));
    expect(createCacheKey(base)).toContain('anon');
  });

  it('separates anonymous from authenticated instances', () => {
    expect(createCacheKey(base)).not.toBe(createCacheKey({ ...base, apiKey: 'k', secret: 's' }));
  });

  it('still discriminates exchange, market type, ccxt type and sandbox', () => {
    const keys = new Set([
      createCacheKey(base),
      createCacheKey({ ...base, exchangeId: 'kraken' }),
      createCacheKey({ ...base, marketType: 'futures' }),
      createCacheKey({ ...base, ccxtType: 'pro' }),
      createCacheKey({ ...base, sandbox: true }),
    ]);

    expect(keys.size).toBe(5);
  });

  it.each([
    ['coinbaseadvanced', 'coinbase'],
    ['gateio', 'gate'],
    ['huobi', 'htx'],
  ])('reuses the canonical cache entry for legacy id %s', (legacy, canonical) => {
    expect(canonicalExchangeId(legacy)).toBe(canonical);
    expect(createCacheKey({ ...base, exchangeId: legacy })).toBe(
      createCacheKey({ ...base, exchangeId: canonical }),
    );
  });
});

describe('getCCXTInstance — exchangeId validation', () => {
  // Guards the dynamic `ccxt[config.exchangeId]` lookup: 'constructor' used to
  // resolve to Object, so `new Object(instanceConfig)` was cached as an exchange.
  it.each(['constructor', 'toString', '__proto__', 'valueOf', 'nope-not-an-exchange'])(
    'rejects %s as an exchange id',
    async (exchangeId) => {
      await expect(getCCXTInstance({ ...base, exchangeId })).rejects.toThrow(/not found in CCXT/);
    },
  );
});
