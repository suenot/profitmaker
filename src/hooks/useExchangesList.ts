import { useState, useEffect } from 'react';
import type { CCXTLibrary, CCXTExchangeClass, CCXTExchangeInstance } from '../types/dataProviders';

// CCXT loaded via CDN script tag - available as window.ccxt
declare global {
  interface Window {
    ccxt: CCXTLibrary | undefined;
  }
}

// Interface for exchange information
export interface ExchangeInfo {
  id: string;
  name: string;
  has: Record<string, boolean | undefined>;
}

// Safe fallback exchanges list
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

// Safe loading of exchanges list from CCXT with full error handling
const loadCCXTExchanges = (): Promise<ExchangeInfo[]> => {
  return new Promise((resolve) => {
    try {
      const exchanges: ExchangeInfo[] = [];
      
      // Check CCXT availability with detailed logging
      if (!window?.ccxt) {
        console.warn('⚠️ CCXT not loaded via CDN, using fallback list');
        resolve(getFallbackExchanges());
        return;
      }
      
      // Check window.ccxt.exchanges type  
      let exchangeIds: string[] = [];
      
      if (Array.isArray(window.ccxt.exchanges)) {
        // If it's an array
        exchangeIds = window.ccxt.exchanges;
        console.log('📋 window.ccxt.exchanges is array');
      } else if (window.ccxt.exchanges && typeof window.ccxt.exchanges === 'object') {
        // If it's an object - take keys
        exchangeIds = Object.keys(window.ccxt.exchanges);
        console.log('📋 window.ccxt.exchanges is object, using keys');
      } else {
        // Fallback: search for exchange class functions in window.ccxt
        exchangeIds = Object.keys(window.ccxt).filter(key => {
          const item = window.ccxt[key];
          return typeof item === 'function' && 
                 key !== 'Exchange' && 
                 key !== 'version' && 
                 key !== 'default' &&
                 !key.startsWith('_') &&
                 key.length > 2;
        });
        console.log('📋 Using fallback: scanning ccxt object keys');
      }
    
      console.log(`🔍 Found ${exchangeIds.length} exchange classes in CCXT:`, exchangeIds);
      
      for (const exchangeId of exchangeIds) {
        try {
          const ExchangeClass = window.ccxt?.[exchangeId] as CCXTExchangeClass | undefined;
          if (ExchangeClass && typeof ExchangeClass === 'function') {
            const exchange: CCXTExchangeInstance = new ExchangeClass();
            exchanges.push({
              id: exchangeId,
              name: exchange.name || exchangeId,
              has: (exchange.has as Record<string, boolean | undefined>) || {}
            });
          }
        } catch (error) {
          // Some exchanges may not initialize without parameters
          exchanges.push({
            id: exchangeId,
            name: exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1),
            has: {}
          });
        }
      }
      
      // Sort by name
      const sortedExchanges = exchanges.sort((a, b) => a.name.localeCompare(b.name));
      console.log(`✅ Successfully loaded ${sortedExchanges.length} exchanges from CCXT`);
      resolve(sortedExchanges);
    } catch (error) {
      console.error('🛡️ Safe error handling for CCXT exchanges loading:', error);
      // Return fallback list to ensure functionality
      resolve(getFallbackExchanges());
    }
  });
};

/**
 * Hook for loading exchanges list from CCXT
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
        const exchangesList = await loadCCXTExchanges();
        setExchanges(exchangesList);
        console.log(`🔥 useExchangesList: Successfully loaded ${exchangesList.length} exchanges`);
      } catch (err) {
        console.error('🛡️ useExchangesList: Error loading exchanges:', err);
        setError(err instanceof Error ? err.message : 'Failed to load exchanges');
        // Set fallback list on any errors
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