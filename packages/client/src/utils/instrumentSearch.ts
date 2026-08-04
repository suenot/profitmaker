/**
 * Display-only account marker for instruments loaded from public exchange data.
 * It must never be persisted as a credential id or passed to trading APIs.
 */
export const PUBLIC_INSTRUMENT_ACCOUNT = '-';

export interface Instrument {
  account: string;
  accountLabel?: string;
  exchange: string;
  market: string;
  pair: string;
}

export interface ExchangeOption {
  id: string;
  name: string;
}

export type ExchangeMarketCatalog = Record<string, string[]>;

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const getPublicExchangeIds = (
  exchangeIds: string[],
  accountExchangeIds: string[],
): string[] => {
  const connectedExchanges = new Set(accountExchangeIds);

  return Array.from(new Set(exchangeIds)).filter(
    (exchangeId) => !connectedExchanges.has(exchangeId),
  );
};

export const createPublicInstrument = (
  exchange: string,
  market: string,
  pair: string,
) => ({
  account: PUBLIC_INSTRUMENT_ACCOUNT,
  accountLabel: PUBLIC_INSTRUMENT_ACCOUNT,
  exchange,
  market,
  pair,
});

export const getStoredInstrumentAccount = (account: string): string | undefined =>
  account === PUBLIC_INSTRUMENT_ACCOUNT ? undefined : account;

export const toGroupInstrumentSelection = (instrument: Instrument) => ({
  account: getStoredInstrumentAccount(instrument.account),
  exchange: instrument.exchange,
  market: instrument.market,
  tradingPair: instrument.pair,
});

export const createCatalogInstruments = (
  exchange: string,
  catalog: ExchangeMarketCatalog,
  account: string,
  accountLabel?: string,
): Instrument[] => Object.entries(catalog).flatMap(([market, symbols]) =>
  symbols.map((pair) => ({
    account,
    accountLabel,
    exchange,
    market,
    pair,
  })),
);

export const getMatchingPublicExchangeIds = (
  exchanges: ExchangeOption[],
  accountExchangeIds: string[],
  query: string,
): string[] => {
  const words = query.toLowerCase().trim().split(/\s+/).filter((word) => word.length >= 2);
  if (!words.length) return [];

  const publicIds = new Set(getPublicExchangeIds(
    exchanges.map((exchange) => exchange.id),
    accountExchangeIds,
  ));

  return exchanges
    .filter((exchange) => {
      if (!publicIds.has(exchange.id)) return false;
      const id = exchange.id.toLowerCase();
      const name = exchange.name.toLowerCase();
      return words.some((word) => id.includes(word) || name.includes(word) || word.includes(id));
    })
    .map((exchange) => exchange.id);
};

export const loadExchangeMarketCatalog = async (
  exchange: string,
  getMarketsForExchange: (exchange: string) => Promise<string[]>,
  getSymbolsForExchange: (exchange: string, limit?: number, marketType?: string) => Promise<string[]>,
  symbolLimit: number,
): Promise<ExchangeMarketCatalog> => {
  const loadedMarkets = await getMarketsForExchange(exchange);
  const markets = uniqueStrings(loadedMarkets.length ? loadedMarkets : ['spot']);
  const entries = await Promise.all(markets.map(async (market) => [
    market,
    uniqueStrings(await getSymbolsForExchange(exchange, symbolLimit, market)),
  ] as const));

  return Object.fromEntries(entries);
};
