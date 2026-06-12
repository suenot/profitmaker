import * as React from 'react';
import { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import * as jsxRuntime from 'react/jsx-runtime';
import * as jsxDevRuntime from 'react/jsx-dev-runtime';
import * as zustand from 'zustand';
import { io } from 'socket.io-client';

import type {
  TerminalAPI,
  WidgetGroupContext,
  UseMarketDataOptions,
  UseMarketDataResult,
  ModuleSocket,
} from '@profitmaker/module-sdk';
import { TERMINAL_API_VERSION } from '@profitmaker/module-sdk';

import { useWidgetRegistry } from './registry';
import { resolveServerBase, resolveServerToken, moduleFetch } from './api';

import { useDataProviderStore } from '@/store/dataProviderStore';
import { useGroupStore } from '@/store/groupStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { useSettingsDrawerStore } from '@/store/settingsDrawerStore';
import { useNotificationStore } from '@/store/notificationStore';
import { deriveSocketUrl } from '@/store/providers/ccxtServerProvider';
import type { MarketType } from '@/types/dataProviders';

// ---------------------------------------------------------------------------
// Host hooks exposed to module widgets
// ---------------------------------------------------------------------------

/** Resolve a widget's group into exchange/symbol/market/account context. */
function useWidgetGroup(groupId?: string): WidgetGroupContext {
  // Subscribe to the groups array so context updates when the group changes.
  const groups = useGroupStore((s) => s.groups);
  const group = groupId ? groups.find((g) => g.id === groupId) : undefined;

  const exchange = group?.exchange || undefined;
  const symbol = group?.tradingPair || undefined;
  const market = (group?.market as MarketType | undefined) || undefined;
  const account = group?.account || undefined;

  return {
    exchange,
    symbol,
    market,
    account,
    isComplete: Boolean(exchange && symbol),
  };
}

/**
 * Subscribe to market data for the lifetime of the calling component
 * (ref-counted via the data-provider store's subscribe/unsubscribe). Returns
 * reactive data: the component re-renders as the store's market data updates.
 */
function useMarketData(opts: UseMarketDataOptions): UseMarketDataResult {
  const { exchange, symbol, dataType, timeframe, market = 'spot', subscriberId } = opts;

  const subscribe = useDataProviderStore((s) => s.subscribe);
  const unsubscribe = useDataProviderStore((s) => s.unsubscribe);

  // Reactive reads: select straight from the store so updates trigger re-renders.
  const candles = useDataProviderStore((s) =>
    dataType === 'candles' ? s.getCandles(exchange, symbol, timeframe, market) : undefined,
  );
  const trades = useDataProviderStore((s) =>
    dataType === 'trades' ? s.getTrades(exchange, symbol, market) : undefined,
  );
  const orderbook = useDataProviderStore((s) =>
    dataType === 'orderbook' ? s.getOrderBook(exchange, symbol, market) : undefined,
  );
  const ticker = useDataProviderStore((s) =>
    dataType === 'ticker' ? s.getTicker(exchange, symbol, market) : undefined,
  );

  useEffect(() => {
    if (!exchange || !symbol) return;
    let cancelled = false;
    void subscribe(subscriberId, exchange, symbol, dataType, timeframe, market).catch((err) => {
      console.error(`[module-runtime] useMarketData subscribe failed for ${subscriberId}`, err);
    });
    return () => {
      cancelled = true;
      unsubscribe(subscriberId, exchange, symbol, dataType, timeframe, market);
      void cancelled;
    };
    // Re-subscribe when the instrument or data type changes.
  }, [subscriberId, exchange, symbol, dataType, timeframe, market, subscribe, unsubscribe]);

  return { candles, trades, orderbook, ticker };
}

/**
 * Socket.IO connection to this module's backend namespace (/m/<moduleId>) on
 * the terminal's socket server. The socket URL is derived from the resolved
 * server base the same way ccxtServerProvider does (server HTTP port + 1).
 */
function useModuleSocket(moduleId: string): ModuleSocket | null {
  const [socket, setSocket] = useState<ModuleSocket | null>(null);

  // React to provider-config changes (URL/token) by re-reading on provider updates.
  const providers = useDataProviderStore((s) => s.providers);

  useEffect(() => {
    const base = resolveServerBase();
    const token = resolveServerToken();
    const socketUrl = deriveSocketUrl(base);
    const s = io(`${socketUrl}/m/${moduleId}`, {
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });
    setSocket(s as unknown as ModuleSocket);
    return () => {
      s.disconnect();
      setSocket(null);
    };
    // providers is included so a server-url/token change reconnects the socket.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId, providers]);

  return socket;
}

// ---------------------------------------------------------------------------
// Runtime bootstrap
// ---------------------------------------------------------------------------

let initialized = false;

/**
 * Build `window.__PROFITMAKER__` (the host TerminalAPI). MUST be called before
 * any module bundle is imported — module bundles read host singletons (React,
 * zustand, ...) and call `terminal.widgets.register(...)` at import/register
 * time. Idempotent.
 */
export function initRuntime(): TerminalAPI {
  if (typeof window !== 'undefined' && window.__PROFITMAKER__) {
    return window.__PROFITMAKER__;
  }

  const registry = useWidgetRegistry.getState();
  const notifications = useNotificationStore.getState();

  const terminal: TerminalAPI = {
    apiVersion: TERMINAL_API_VERSION,

    // Host singletons — module bundles import these via SDK runtime shims so a
    // module's React/zustand are the SAME instances as the host's.
    React,
    ReactDOM,
    ReactDOMClient,
    jsxRuntime,
    jsxDevRuntime,
    zustand,

    widgets: {
      register: (def) => useWidgetRegistry.getState().register(def),
      registerMany: (defs) => useWidgetRegistry.getState().registerMany(defs),
      unregister: (type) => useWidgetRegistry.getState().unregister(type),
    },

    stores: {
      useDataProviderStore,
      useGroupStore,
      useDashboardStore,
      useSettingsDrawerStore,
    },

    hooks: {
      useWidgetGroup,
      useMarketData,
      useModuleSocket,
    },

    api: {
      fetch: (path, init) => moduleFetch(path, init),
      get baseUrl() {
        return resolveServerBase();
      },
    },

    notify: {
      success: (message) => notifications.showSuccess(message),
      error: (message) => notifications.showError(message),
      info: (message) => notifications.showInfo(message),
    },
  };

  if (typeof window !== 'undefined') {
    window.__PROFITMAKER__ = terminal;
  }
  initialized = true;
  void registry; // referenced for clarity; widgets.* read live state on call
  return terminal;
}

/** Whether initRuntime() has run (window.__PROFITMAKER__ is installed). */
export function isRuntimeInitialized(): boolean {
  return initialized;
}
