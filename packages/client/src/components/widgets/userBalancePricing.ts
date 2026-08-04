import type { MarketType, Ticker } from '../../types/dataProviders';

const USD_QUOTE_CURRENCIES = ['USDT', 'USDC', 'USD', 'BUSD'] as const;

const DIRECT_USD_EQUIVALENTS = new Set([
  'USDT', 'USDC', 'DAI', 'USDP', 'TUSD', 'PYUSD', 'BUSD', 'SUSD',
  'EURC', 'EURS', 'EURT', 'AEUR', 'EURCV', 'VEUR',
  'GBPT', 'TGBP', 'POUNDTOKEN',
  'GYEN', 'JPYC', 'CJPY',
  'CNHT', 'CNHC', 'TCNH',
  'VCHF', 'CCHF',
  'TAUD', 'AUDN',
  'QCAD', 'ECAD', 'TRUECAD',
  'BRL1', 'BBRL',
  'USD',
]);

type GetSymbolsForExchange = (
  exchange: string,
  limit?: number,
  marketType?: string,
) => Promise<string[]>;

type GetTickerWithRefresh = (
  exchange: string,
  symbol: string,
  market: MarketType,
  forceRefresh: boolean,
) => Promise<Ticker | undefined>;

export interface UsdPriceResult {
  value?: number;
  rate?: string;
}

export type ListedSpotMarketLoader = (exchange: string) => Promise<ReadonlySet<string>>;

const normalizeSymbol = (symbol: string) => symbol.trim().toUpperCase();

export const getDirectUsdValue = (currency: string, amount: number): UsdPriceResult | undefined => {
  if (!DIRECT_USD_EQUIVALENTS.has(currency.toUpperCase())) return undefined;
  return { value: amount, rate: '1:1' };
};

/**
 * Loads each exchange's complete spot symbol list once. Empty and failed loads
 * are not cached, so a transient metadata failure can recover on the next
 * balance refresh while successful catalogs are reused for every asset.
 */
export const createListedSpotMarketLoader = (
  getSymbolsForExchange: GetSymbolsForExchange,
): ListedSpotMarketLoader => {
  const cache = new Map<string, Promise<ReadonlySet<string>>>();

  return async (exchange: string) => {
    const cacheKey = exchange.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const request = getSymbolsForExchange(exchange, undefined, 'spot')
      .then((symbols) => {
        const listed = new Set(symbols.map(normalizeSymbol).filter(Boolean));
        if (listed.size === 0) cache.delete(cacheKey);
        return listed;
      })
      .catch((error) => {
        cache.delete(cacheKey);
        throw error;
      });

    cache.set(cacheKey, request);
    return request;
  };
};

/**
 * Resolves a balance through listed USD-quoted spot markets only. Missing
 * markets and stale/delisted ticker candidates are expected misses: they do
 * not produce widget errors and leave the USD value unavailable.
 */
export const resolveListedUsdPrice = async ({
  currency,
  amount,
  exchange,
  getListedSpotMarkets,
  getTickerWithRefresh,
}: {
  currency: string;
  amount: number;
  exchange: string;
  getListedSpotMarkets: ListedSpotMarketLoader;
  getTickerWithRefresh: GetTickerWithRefresh;
}): Promise<UsdPriceResult> => {
  let listedMarkets: ReadonlySet<string>;

  try {
    listedMarkets = await getListedSpotMarkets(exchange);
  } catch {
    return {};
  }

  const base = currency.toUpperCase();

  for (const quote of USD_QUOTE_CURRENCIES) {
    const symbol = `${base}/${quote}`;
    if (!listedMarkets.has(normalizeSymbol(symbol))) continue;

    try {
      const ticker = await getTickerWithRefresh(exchange, symbol, 'spot', false);
      const bid = ticker?.bid;
      if (typeof bid !== 'number' || !Number.isFinite(bid) || bid <= 0) continue;

      return {
        value: amount * bid,
        rate: `${bid.toFixed(6)} ${quote}`,
      };
    } catch {
      // The market may have been delisted after the catalog was loaded. Try the
      // next listed quote and otherwise keep valuation unavailable.
    }
  }

  return {};
};
