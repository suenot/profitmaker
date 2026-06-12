import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { persist } from 'zustand/middleware';
import { enableMapSet } from 'immer';

import type { DataProviderStore, DataProviderState } from './types';
import type { CCXTServerProvider } from '../types/dataProviders';

// Actions imports
import { createProviderActions } from './actions/providerActions';
import { createSubscriptionActions } from './actions/subscriptionActions';
import { createDataActions } from './actions/dataActions';
import { createFetchingActions } from './actions/fetchingActions';
import { createCCXTActions } from './actions/ccxtActions';
import { createEventActions } from './actions/eventActions';

// Enable Map and Set support in Immer
enableMapSet();

// Default server base: VITE_SERVER_URL in env, else localhost:3001 in dev,
// else the page origin (production serves the API from the same origin).
const defaultServerUrl = (): string => {
  const fromEnv = import.meta.env.VITE_SERVER_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin && !import.meta.env.DEV) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:3001';
};

// The single default data provider: the ccxt-server.
const makeDefaultProvider = (): CCXTServerProvider => ({
  id: 'primary-server',
  type: 'ccxt-server',
  name: 'Primary Server',
  status: 'connected',
  exchanges: ['*'],
  priority: 1,
  config: {
    serverUrl: defaultServerUrl(),
  },
});

export const useDataProviderStore = create<DataProviderStore>()(
  persist(
    subscribeWithSelector(
      immer((set, get, store) => {
        // Create default server provider
        const defaultProvider = makeDefaultProvider();

        // Initial state
        const initialState: DataProviderState = {
          providers: {
            [defaultProvider.id]: defaultProvider
          },
          activeProviderId: defaultProvider.id, // Deprecated, kept for compatibility
          dataFetchSettings: {
            method: 'websocket',
            restIntervals: {
              trades: 1000,   // 1 second
              candles: 5000,  // 5 seconds
              orderbook: 500, // 0.5 seconds
              balance: 30000, // 30 seconds
              ticker: 600000  // 10 minutes (600 seconds)
            }
          },
          activeSubscriptions: {},
          restCycles: {},
          marketData: {
            candles: {}, // [exchange][market][symbol][timeframe] -> Candle[]
            trades: {},  // [exchange][market][symbol] -> Trade[]
            orderbook: {}, // [exchange][market][symbol] -> OrderBook
            balance: {}, // [exchange][market] -> ExchangeBalances
            ticker: {} // [exchange][market][symbol] -> Ticker with cache timestamp
          },
          chartUpdateListeners: {}, // Event system for Chart widgets
          loading: false,
          error: null
        };

        return {
          ...initialState,
          ...createProviderActions(set, get, store),
          ...createSubscriptionActions(set, get, store),
          ...createDataActions(set, get, store),
          ...createFetchingActions(set, get, store),
          ...createCCXTActions(set, get, store),
          ...createEventActions(set, get, store)
        };
      })
    ),
    {
      name: 'data-provider-store',
      version: 2,
      partialize: (state) => ({
        providers: state.providers,
        activeProviderId: state.activeProviderId,
        dataFetchSettings: state.dataFetchSettings
      }),
      // v2: drop the legacy 'universal-browser' (ccxt-browser) provider and any
      // other browser providers; ensure the ccxt-server 'primary-server' default
      // exists. Preserve a user's existing ccxt-server config (URL/token).
      migrate: (persisted: any, version: number) => {
        const state = persisted ?? {};
        const providers = { ...(state.providers ?? {}) };

        // Strip every legacy browser provider.
        for (const id of Object.keys(providers)) {
          if (providers[id]?.type === 'ccxt-browser') {
            delete providers[id];
          }
        }

        // Ensure a primary-server provider exists, preferring any persisted
        // ccxt-server config so the user keeps their URL/token.
        if (!providers['primary-server']) {
          const existingServer = Object.values(providers).find((p: any) => p?.type === 'ccxt-server') as any;
          const def = makeDefaultProvider();
          providers['primary-server'] = existingServer
            ? { ...def, config: { ...def.config, ...existingServer.config } }
            : def;
        }

        const activeProviderId =
          state.activeProviderId && providers[state.activeProviderId]
            ? state.activeProviderId
            : 'primary-server';

        console.log(`🔄 Data Provider Store: migrated v${version} → v2`, {
          providers: Object.keys(providers),
          activeProviderId,
        });

        return { ...state, providers, activeProviderId };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure the server default provider exists after rehydration.
          if (!state.providers['primary-server']) {
            state.providers['primary-server'] = makeDefaultProvider();
          }
          if (!state.activeProviderId || !state.providers[state.activeProviderId]) {
            state.activeProviderId = 'primary-server';
          }

          console.log('🔄 Data Provider Store: Rehydrated from localStorage', {
            providers: Object.keys(state.providers),
            activeProviderId: state.activeProviderId
          });
        }
      }
    }
  )
); 