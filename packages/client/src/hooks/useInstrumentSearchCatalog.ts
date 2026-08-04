import { useEffect, useMemo, useState } from 'react';
import { useDataProviderStore } from '../store/dataProviderStore';
import { useUserStore } from '../store/userStore';
import { useExchangesList } from './useExchangesList';
import {
  createCatalogInstruments,
  getMatchingPublicExchangeIds,
  getPublicExchangeIds,
  loadExchangeMarketCatalog,
  PUBLIC_INSTRUMENT_ACCOUNT,
} from '../utils/instrumentSearch';
import type {
  ExchangeMarketCatalog,
  Instrument,
} from '../utils/instrumentSearch';

const SYMBOL_LIMIT_PER_MARKET = 500;
const catalogCache = new Map<string, ExchangeMarketCatalog>();
const catalogRequests = new Map<string, Promise<ExchangeMarketCatalog>>();

interface InstrumentSearchCatalogOptions {
  enabled: boolean;
  query: string;
  selectedExchange?: string;
}

const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const loadExchangeCatalog = async (
  cacheKey: string,
  exchange: string,
  getMarketsForExchange: (exchange: string) => Promise<string[]>,
  getSymbolsForExchange: (exchange: string, limit?: number, marketType?: string) => Promise<string[]>,
): Promise<ExchangeMarketCatalog> => {
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  const pending = catalogRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    try {
      const catalog = await loadExchangeMarketCatalog(
        exchange,
        getMarketsForExchange,
        getSymbolsForExchange,
        SYMBOL_LIMIT_PER_MARKET,
      );

      // Empty results are not cached so a transient provider failure can recover
      // the next time the search is opened.
      if (Object.values(catalog).some((symbols) => symbols.length > 0)) {
        catalogCache.set(cacheKey, catalog);
      }
      return catalog;
    } catch (error) {
      console.error(`Failed to load instrument catalog for ${exchange}:`, error);
      return {};
    }
  })().finally(() => {
    catalogRequests.delete(cacheKey);
  });

  catalogRequests.set(cacheKey, request);
  return request;
};

export const useInstrumentSearchCatalog = ({
  enabled,
  query,
  selectedExchange,
}: InstrumentSearchCatalogOptions) => {
  const { users, activeUserId } = useUserStore();
  const {
    activeProviderId,
    getMarketsForExchange,
    getSymbolsForExchange,
  } = useDataProviderStore();
  const { exchanges } = useExchangesList();
  const activeUser = users.find((user) => user.id === activeUserId);
  const providerKey = activeProviderId || 'default';

  const accountExchangeIds = useMemo(
    () => unique(activeUser?.accounts.map((account) => account.exchange) ?? []),
    [activeUser?.accounts],
  );
  const publicExchangeIds = useMemo(
    () => getPublicExchangeIds(
      exchanges.map((exchange) => exchange.id),
      accountExchangeIds,
    ),
    [accountExchangeIds, exchanges],
  );
  const matchingPublicExchangeIds = useMemo(
    () => getMatchingPublicExchangeIds(exchanges, accountExchangeIds, query),
    [accountExchangeIds, exchanges, query],
  );
  const defaultExchange = useMemo(() => {
    if (accountExchangeIds.length) return undefined;
    if (selectedExchange) return selectedExchange;
    return exchanges.find((exchange) => exchange.id === 'binance')?.id ?? exchanges[0]?.id;
  }, [accountExchangeIds, exchanges, selectedExchange]);
  const exchangeIdsToLoad = useMemo(() => {
    if (!enabled) return [];
    return unique([
      ...accountExchangeIds,
      selectedExchange || '',
      defaultExchange || '',
      ...matchingPublicExchangeIds,
    ]);
  }, [accountExchangeIds, defaultExchange, enabled, matchingPublicExchangeIds, selectedExchange]);

  const [catalogs, setCatalogs] = useState<Record<string, ExchangeMarketCatalog>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setCatalogs({});
  }, [providerKey]);

  useEffect(() => {
    if (!exchangeIdsToLoad.length) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all(exchangeIdsToLoad.map(async (exchange) => {
      const catalog = await loadExchangeCatalog(
        `${providerKey}:${exchange}`,
        exchange,
        getMarketsForExchange,
        getSymbolsForExchange,
      );
      return [exchange, catalog] as const;
    }))
      .then((entries) => {
        if (!cancelled) {
          setCatalogs((current) => ({ ...current, ...Object.fromEntries(entries) }));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [exchangeIdsToLoad, getMarketsForExchange, getSymbolsForExchange, providerKey]);

  const instruments = useMemo(() => {
    const result: Instrument[] = [];
    const connectedExchanges = new Set(accountExchangeIds);

    activeUser?.accounts.forEach((account) => {
      const catalog = catalogs[account.exchange];
      if (!catalog) return;
      result.push(...createCatalogInstruments(
        account.exchange,
        catalog,
        account.id,
        account.label || account.email || account.exchange,
      ));
    });

    publicExchangeIds.forEach((exchange) => {
      if (connectedExchanges.has(exchange) || !catalogs[exchange]) return;
      result.push(...createCatalogInstruments(
        exchange,
        catalogs[exchange],
        PUBLIC_INSTRUMENT_ACCOUNT,
        PUBLIC_INSTRUMENT_ACCOUNT,
      ));
    });

    return result;
  }, [accountExchangeIds, activeUser?.accounts, catalogs, publicExchangeIds]);

  return { instruments, isLoading };
};
