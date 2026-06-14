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
}

const instanceCache = new Map<string, { instance: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 1 day

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

export const createCacheKey = (config: CCXTInstanceConfig): string => {
  const parts = [
    config.exchangeId,
    config.marketType || 'spot',
    config.ccxtType || 'regular',
    config.sandbox ? 'sandbox' : 'live',
  ];
  if (config.apiKey) parts.push(config.apiKey.substring(0, 8));
  return parts.join(':');
};

export const getCCXTInstance = async (config: CCXTInstanceConfig): Promise<any> => {
  const cacheKey = createCacheKey(config);
  const cached = instanceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.instance;
  }

  const ccxtType = config.ccxtType || 'regular';
  let ExchangeClass: any;

  if (ccxtType === 'pro') {
    if (!ccxtPro) throw new Error('CCXT Pro not available');
    ExchangeClass = ccxtPro[config.exchangeId];
  } else {
    ExchangeClass = (ccxt as any)[config.exchangeId];
  }

  if (!ExchangeClass) {
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

  if (marketType === 'futures') {
    instanceConfig.defaultType = 'future';
  } else if (marketType === 'spot') {
    instanceConfig.defaultType = 'spot';
  }

  // KuCoin Broker Pro: attribute trades placed through this terminal to the
  // marketmaker broker (kucoin = spot, kucoinfutures = futures).
  if (config.exchangeId.startsWith('kucoin')) {
    applyKucoinBroker(config.exchangeId, instanceConfig);
  }

  const exchangeInstance = new ExchangeClass(instanceConfig);

  try {
    await exchangeInstance.loadMarkets();
  } catch (error) {
    console.warn(`Failed to load markets for ${config.exchangeId}:`, error);
  }

  instanceCache.set(cacheKey, { instance: exchangeInstance, timestamp: Date.now() });
  return exchangeInstance;
};

export const cleanupCache = () => {
  const now = Date.now();
  for (const [key, cached] of instanceCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      instanceCache.delete(key);
    }
  }
};

export { ccxtPro };
