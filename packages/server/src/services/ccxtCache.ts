import { createHash } from 'node:crypto';
import ccxt from 'ccxt';

let ccxtPro: any = null;
try {
  ccxtPro = (ccxt as any).pro;
} catch {
  console.warn('CCXT Pro not available, WebSocket features will be disabled');
}

export interface CCXTInstanceConfig {
  exchangeId: string;
  marketType?: string;
  ccxtType?: 'regular' | 'pro';
  apiKey?: string;
  secret?: string;
  password?: string;
  sandbox?: boolean;
  /**
   * Authenticated caller who owns this instance. Authenticated instances are
   * namespaced by it so two identities never share one, even if they somehow
   * present the same credential tuple. Omitted for public/anonymous configs.
   */
  userId?: string;
}

interface CacheEntry {
  instance: any;
  timestamp: number;
  /** Per-entry lifetime — a degraded entry expires far sooner than a healthy one. */
  ttl: number;
  /** Active consumers whose websocket runtime must not be evicted. */
  leases: number;
}

const instanceCache = new Map<string, CacheEntry>();

/** Lifetime of a healthy instance (markets loaded successfully). */
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day
/**
 * Lifetime of an instance whose `loadMarkets()` FAILED — deliberately three
 * orders of magnitude shorter than CACHE_TTL.
 *
 * Caching a degraded instance at all is what keeps an unreachable exchange from
 * turning every inbound request into a fresh ccxt construction plus a fresh
 * loadMarkets attempt against a dead endpoint, i.e. an outage amplifier that
 * converts their downtime into ours. Keeping the window this short means symbol
 * discovery recovers seconds after the exchange returns, rather than a day
 * later (`getCapabilities`/`getMarket` read `ex.markets`/`ex.symbols` directly,
 * so a degraded entry serves empty discovery for exactly this long).
 */
const DEGRADED_CACHE_TTL = 30 * 1000; // 30 seconds
/**
 * Hard bound on cached instances. Without it the cache is only ever trimmed by
 * the 24h TTL, so a caller cycling distinct credentials (or exchanges) grows it
 * without limit — and every ccxt.pro entry holds live sockets.
 */
const MAX_CACHED_INSTANCES = 200;

/**
 * ccxt reads the market type from `options.defaultType`, so this maps our wire
 * `marketType` onto the values ccxt actually recognizes.
 */
const CCXT_DEFAULT_TYPE: Record<string, string> = {
  spot: 'spot',
  futures: 'future',
  future: 'future',
  swap: 'swap',
  margin: 'margin',
  delivery: 'delivery',
  option: 'option',
};

/** Legacy CCXT ids removed in 4.5.74 but still present in saved accounts/groups. */
const CCXT_EXCHANGE_ALIASES = new Map<string, string>([
  ['coinbaseadvanced', 'coinbase'],
  ['gateio', 'gate'],
  ['huobi', 'htx'],
]);

export const canonicalExchangeId = (exchangeId: string): string => (
  CCXT_EXCHANGE_ALIASES.get(exchangeId) ?? exchangeId
);

interface KucoinPartnerLeg {
  id: string;
  key: string;
  name?: string;
}

/** Read one KuCoin Broker Pro partner leg (spot or futures) from env. */
const kucoinPartnerLeg = (prefix: 'SPOT' | 'FUTURES'): KucoinPartnerLeg | undefined => {
  const id = process.env[`KUCOIN_BROKER_${prefix}_PARTNER`];
  const key = process.env[`KUCOIN_BROKER_${prefix}_KEY`];
  const name = process.env[`KUCOIN_BROKER_${prefix}_NAME`];
  if (!id || !key) return undefined;
  return { id, key, name };
};

/**
 * KuCoin Broker Pro attribution. ccxt's kucoin/kucoinfutures `sign()` reads
 * `options.partner.{spot,future} = { id, key, name }` and, on every
 * AUTHENTICATED request, emits `KC-API-PARTNER` + `KC-API-PARTNER-SIGN`
 * (= base64(HMAC-SHA256(timestamp+partnerId+apiKey, brokerKey))) +
 * `KC-API-PARTNER-VERIFY` — this is what attributes the trade's rebate to the
 * "marketmaker" broker. The broker-key is an HMAC secret and stays server-side.
 * No-op when the env creds are absent (open-source / self-host installs are
 * unaffected). ccxt 4.5.45 only emits `KC-BROKER-NAME` on broker-management
 * endpoints (not order calls), so we also set it as a persistent header.
 */
const applyKucoinBroker = (exchangeId: string, instanceConfig: any): void => {
  const spot = kucoinPartnerLeg('SPOT');
  const future = kucoinPartnerLeg('FUTURES');
  if (!spot && !future) return; // broker not configured

  const partner: Record<string, KucoinPartnerLeg> = {};
  if (spot) partner.spot = spot;
  if (future) partner.future = future;
  instanceConfig.options = { ...(instanceConfig.options || {}), partner };

  const leg = exchangeId === 'kucoinfutures' ? future : spot;
  if (leg?.name) instanceConfig.headers['KC-BROKER-NAME'] = leg.name;
};

/**
 * Collision-free fingerprint of a full credential tuple. Length-prefixes each
 * field so ('ab','c') and ('a','bc') cannot fingerprint alike, and returns only
 * a digest — no fragment of a secret ever reaches the cache key.
 */
const credentialFingerprint = (config: CCXTInstanceConfig): string => {
  const hash = createHash('sha256');
  for (const field of [config.apiKey, config.secret, config.password]) {
    const value = field ?? '';
    hash.update(`${value.length}\0${value}\0`);
  }
  return hash.digest('hex');
};

/**
 * Cache key for a ccxt instance.
 *
 * SECURITY: an authenticated entry is reusable ONLY by a caller presenting the
 * exact same full credential tuple, under the same user id. This previously
 * keyed on `apiKey.substring(0, 8)` and ignored the secret entirely, so anyone
 * who supplied a matching 8-char prefix (with any secret at all) was handed
 * back another user's fully-authenticated instance — enough to read their
 * balances and trade on their account.
 *
 * Credential-less configs are public market data and are deliberately shared
 * process-wide; they carry nothing worth isolating.
 */
export const createCacheKey = (config: CCXTInstanceConfig): string => {
  const parts = [
    canonicalExchangeId(config.exchangeId),
    config.marketType || 'spot',
    config.ccxtType || 'regular',
    config.sandbox ? 'sandbox' : 'live',
  ];

  if (!config.apiKey && !config.secret) {
    parts.push('anon');
    return parts.join(':');
  }

  parts.push(`u=${config.userId ?? 'unscoped'}`);
  parts.push(`c=${credentialFingerprint(config)}`);
  return parts.join(':');
};

/**
 * Release an evicted instance. ccxt.pro instances hold live WebSocket
 * connections and keep-alive timers; dropping the map reference alone leaks
 * both for the lifetime of the process.
 */
const closeInstance = async (instance: any): Promise<void> => {
  if (typeof instance?.close !== 'function') return;
  try {
    await instance.close();
  } catch (error) {
    console.warn('Failed to close evicted CCXT instance:', error);
  }
};

/**
 * Evict least-recently-used entries until the cache is back within its bound.
 * A Map iterates in insertion order and every cache hit re-inserts its key, so
 * the first key is always the least recently used one.
 *
 * Leased websocket runtimes are skipped. Private subscriptions are globally
 * bounded by their owning service, so leases cannot grow this cache without a
 * corresponding subscription limit.
 */
const evictOverflow = async (): Promise<void> => {
  while (instanceCache.size > MAX_CACHED_INSTANCES) {
    const candidate = Array.from(instanceCache.entries()).find(([, entry]) => entry.leases === 0);
    if (!candidate) return;
    const [key, entry] = candidate;
    instanceCache.delete(key);
    if (entry) await closeInstance(entry.instance);
  }
};

export const getCCXTInstance = async (
  config: CCXTInstanceConfig,
  options: { lease?: boolean } = {},
): Promise<any> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);

  if (cached) {
    if (cached.leases > 0 || Date.now() - cached.timestamp < cached.ttl) {
      // LRU touch: re-insert so this key becomes the most-recently-used.
      instanceCache.delete(cacheKey);
      instanceCache.set(cacheKey, cached);
      if (options.lease) cached.leases += 1;
      return cached.instance;
    }
    // Expired: drop it and close its sockets before building a replacement.
    instanceCache.delete(cacheKey);
    await closeInstance(cached.instance);
  }

  const ccxtType = config.ccxtType || 'regular';
  const exchangeId = canonicalExchangeId(config.exchangeId);

  // Validate against ccxt's own exchange list BEFORE the dynamic property
  // access below: `exchangeId: 'constructor'` would otherwise resolve to Object
  // and cache `new Object(instanceConfig)` as though it were an exchange.
  const knownExchanges: string[] = (ccxt as any).exchanges ?? [];
  if (!knownExchanges.includes(exchangeId)) {
    throw new Error(`Exchange ${config.exchangeId} not found in CCXT`);
  }

  let ExchangeClass: any;

  if (ccxtType === 'pro') {
    if (!ccxtPro) throw new Error('CCXT Pro not available');
    ExchangeClass = ccxtPro[exchangeId];
  } else {
    ExchangeClass = (ccxt as any)[exchangeId];
  }

  if (typeof ExchangeClass !== 'function') {
    throw new Error(`Exchange ${config.exchangeId} not found in CCXT${ccxtType === 'pro' ? ' Pro' : ''}`);
  }

  const marketType = config.marketType || 'spot';
  const instanceConfig: any = {
    enableRateLimit: true,
    sandbox: config.sandbox || false,
    headers: {
      'User-Agent': 'Profitmaker-Server/3.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  };

  if (config.apiKey && config.secret) {
    instanceConfig.apiKey = config.apiKey;
    instanceConfig.secret = config.secret;
    if (config.password) instanceConfig.password = config.password;
  }

  // ccxt reads `this.options.defaultType`; a TOP-LEVEL `defaultType` is never
  // read, so setting it there silently routed every futures request to SPOT
  // markets. Spread so applyKucoinBroker's own `options` merge below survives.
  const defaultType = CCXT_DEFAULT_TYPE[marketType];
  if (defaultType) {
    instanceConfig.options = { ...(instanceConfig.options || {}), defaultType };
  }

  // KuCoin Broker Pro: attribute trades placed through this terminal to the
  // marketmaker broker (kucoin = spot, kucoinfutures = futures).
  if (exchangeId.startsWith('kucoin')) {
    applyKucoinBroker(exchangeId, instanceConfig);
  }

  const exchangeInstance = new ExchangeClass(instanceConfig);

  // A failed market load yields a usable-but-degraded instance (ccxt lazy-loads
  // markets on the next call), so cache it — briefly. See DEGRADED_CACHE_TTL.
  let ttl = CACHE_TTL;
  try {
    await exchangeInstance.loadMarkets();
  } catch (error) {
    console.warn(`Failed to load markets for ${config.exchangeId}:`, error);
    ttl = DEGRADED_CACHE_TTL;
  }

  instanceCache.set(cacheKey, {
    instance: exchangeInstance,
    timestamp: Date.now(),
    ttl,
    leases: options.lease ? 1 : 0,
  });
  await evictOverflow();
  return exchangeInstance;
};

export const cleanupCache = async (): Promise<void> => {
  const now = Date.now();
  for (const [key, cached] of instanceCache.entries()) {
    if (cached.leases === 0 && now - cached.timestamp > cached.ttl) {
      instanceCache.delete(key);
      await closeInstance(cached.instance);
    }
  }
  await evictOverflow();
};

/**
 * Remove one exact runtime from the cache and close its sockets. `expected`
 * prevents an old failing watch loop from evicting a replacement installed by
 * another loop for the same configuration.
 */
export const disposeCCXTInstance = async (
  config: CCXTInstanceConfig,
  expected?: any,
): Promise<void> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);
  if (!cached || (expected !== undefined && cached.instance !== expected)) return;
  instanceCache.delete(cacheKey);
  await closeInstance(cached.instance);
};

/** Release one leased runtime and close it when its final owner is gone. */
export const releaseCCXTInstance = async (
  config: CCXTInstanceConfig,
  expected?: any,
): Promise<void> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);
  if (!cached || (expected !== undefined && cached.instance !== expected)) return;
  cached.leases = Math.max(0, cached.leases - 1);
  if (cached.leases > 0) return;
  instanceCache.delete(cacheKey);
  await closeInstance(cached.instance);
};

export { ccxtPro };
