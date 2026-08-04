import { useState, useEffect } from 'react';
import { moduleFetch } from '../modules/api';

// Interface for exchange information
export interface ExchangeInfo {
  id: string;
  name: string;
  has: Record<string, unknown>;
}

// Safe fallback exchanges list (used only if the server is unreachable)
const getFallbackExchanges = (): ExchangeInfo[] => {
  return [
    { id: 'binance', name: 'Binance', has: {} },
    { id: 'bybit', name: 'Bybit', has: {} },
    { id: 'okx', name: 'OKX', has: {} },
    { id: 'kucoin', name: 'KuCoin', has: {} },
    { id: 'coinbase', name: 'Coinbase Pro', has: {} },
    { id: 'huobi', name: 'Huobi', has: {} },
    { id: 'kraken', name: 'Kraken', has: {} },
    { id: 'bitfinex', name: 'Bitfinex', has: {} },
    { id: 'gateio', name: 'Gate.io', has: {} },
    { id: 'mexc', name: 'MEXC', has: {} },
    { id: 'bitget', name: 'Bitget', has: {} }
  ];
};

const titleCase = (id: string) => id.charAt(0).toUpperCase() + id.slice(1);

let exchangesCache: ExchangeInfo[] | null = null;
let exchangesRequest: Promise<ExchangeInfo[]> | null = null;
let exchangesCacheError: string | null = null;

// Load the exchanges list from the terminal server (ccxt.exchanges).
const loadServerExchanges = async (): Promise<ExchangeInfo[]> => {
  const response = await moduleFetch('/api/exchange/list');
  if (!response.ok) {
    throw new Error(`GET /api/exchange/list -> ${response.status}`);
  }
  const result = await response.json();
  const ids: string[] = result.data ?? result.exchanges ?? [];
  return ids
    .map((id) => ({ id, name: titleCase(id), has: {} }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

const loadExchangesOnce = (): Promise<ExchangeInfo[]> => {
  if (exchangesCache) return Promise.resolve(exchangesCache);
  if (exchangesRequest) return exchangesRequest;

  exchangesRequest = loadServerExchanges()
    .catch((error) => {
      console.error('useExchangesList: error loading exchanges from server:', error);
      exchangesCacheError = error instanceof Error ? error.message : 'Failed to load exchanges';
      return getFallbackExchanges();
    })
    .then((exchanges) => {
      exchangesCache = exchanges;
      return exchanges;
    })
    .finally(() => {
      exchangesRequest = null;
    });

  return exchangesRequest;
};

/**
 * Hook for loading the exchanges list from the terminal server.
 */
export const useExchangesList = () => {
  const [exchanges, setExchanges] = useState<ExchangeInfo[]>(exchangesCache ?? []);
  const [loading, setLoading] = useState(!exchangesCache);
  const [error, setError] = useState<string | null>(exchangesCacheError);

  useEffect(() => {
    let cancelled = false;

    const loadExchanges = async () => {
      if (exchangesCache) {
        setExchanges(exchangesCache);
        setError(exchangesCacheError);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const exchangesList = await loadExchangesOnce();
        if (!cancelled) {
          setExchanges(exchangesList);
          setError(exchangesCacheError);
          console.log(`🔥 useExchangesList: loaded ${exchangesList.length} exchanges`);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load exchanges');
          setExchanges(getFallbackExchanges());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExchanges();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    exchanges,
    loading,
    error,
    // Helper function to get exchange by id
    getExchangeById: (id: string) => exchanges.find(ex => ex.id === id),
    // Helper function to get exchange names for select options
    getSelectOptions: () => exchanges.map(ex => ({ value: ex.id, label: ex.name }))
  };
};
