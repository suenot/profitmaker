import { useState, useEffect } from 'react';
import { moduleFetch } from '../modules/api';

// Interface for exchange information
export interface ExchangeInfo {
  id: string;
  name: string;
  has: any;
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

/**
 * Hook for loading the exchanges list from the terminal server.
 */
export const useExchangesList = () => {
  const [exchanges, setExchanges] = useState<ExchangeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadExchanges = async () => {
      setLoading(true);
      setError(null);

      try {
        const exchangesList = await loadServerExchanges();
        setExchanges(exchangesList);
        console.log(`🔥 useExchangesList: loaded ${exchangesList.length} exchanges from server`);
      } catch (err) {
        console.error('useExchangesList: error loading exchanges from server:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exchanges');
        setExchanges(getFallbackExchanges());
      } finally {
        setLoading(false);
      }
    };

    loadExchanges();
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
