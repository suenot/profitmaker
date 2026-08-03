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

import { useWidgetRegistry, HOST_OWNER } from './registry';
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

/**
 * The one host TerminalAPI. Module-local rather than read back off `window`, so
 * a pre-existing (hostile or stale) global can never become the host API we
 * hand to modules.
 */
let hostTerminal: TerminalAPI | null = null;

/**
 * The owner id used for widget registrations made through the *global*
 * `window.__PROFITMAKER__.widgets`, where the caller is unidentified. It is
 * inferred from the type's own namespace (`arbitrage.opportunities` ->
 * `arbitrage`), which is enough to keep such a call from claiming a built-in or
 * another module's type — the registry rejects a claim on a type owned by
 * someone else. Modules loaded normally get a scoped API instead (see
 * {@link createModuleTerminal}), whose owner is authoritative.
 */
function inferOwnerFromType(type: string): string | null {
  const namespace = type.split('.')[0];
  if (!namespace || namespace === type || namespace === HOST_OWNER) return null;
  return namespace;
}

/** Widget API for an unidentified caller (the global object). */
function unscopedWidgetsApi(): TerminalAPI['widgets'] {
  const reject = (type: string) =>
    console.error(
      `[module-runtime] refusing to register/unregister widget type "${type}" through the global ` +
        'Terminal API: module widgets must be namespaced "<moduleId>.<widgetName>". Use the ' +
        'terminal instance passed to your module\'s register(terminal).',
    );
  return {
    register: (def) => {
      const owner = inferOwnerFromType(def.type);
      if (!owner) return reject(def.type);
      useWidgetRegistry.getState().register(def, owner);
    },
    registerMany: (defs) => {
      for (const def of defs) {
        const owner = inferOwnerFromType(def.type);
        if (!owner) {
          reject(def.type);
          continue;
        }
        useWidgetRegistry.getState().register(def, owner);
      }
    },
    unregister: (type) => {
      const owner = inferOwnerFromType(type);
      if (!owner) return reject(type);
      useWidgetRegistry.getState().unregister(type, owner);
    },
  };
}

/**
 * Build `window.__PROFITMAKER__` (the host TerminalAPI). MUST be called before
 * any module bundle is imported — module bundles read host singletons (React,
 * zustand, ...) and call `terminal.widgets.register(...)` at import/register
 * time. Idempotent.
 *
 * The installed global is frozen and defined non-writable/non-configurable: it
 * is the single object every module reaches through, so a module that could
 * overwrite it would MITM `api.fetch` (and its Bearer token) for every module
 * loaded after it.
 */
export function initRuntime(): TerminalAPI {
  if (hostTerminal) return hostTerminal;

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

    widgets: unscopedWidgetsApi(),

    stores: Object.freeze({
      useDataProviderStore,
      useGroupStore,
      useDashboardStore,
      useSettingsDrawerStore,
    }),

    hooks: Object.freeze({
      useWidgetGroup,
      useMarketData,
      useModuleSocket,
    }),

    api: Object.freeze({
      fetch: (path: string, init?: RequestInit) => moduleFetch(path, init),
      get baseUrl() {
        return resolveServerBase();
      },
    }),

    notify: Object.freeze({
      success: (message: string) => notifications.showSuccess(message),
      error: (message: string) => notifications.showError(message),
      info: (message: string) => notifications.showInfo(message),
    }),
  };

  Object.freeze(terminal.widgets);
  hostTerminal = Object.freeze(terminal);

  if (typeof window !== 'undefined') {
    if (window.__PROFITMAKER__) {
      console.error(
        '[module-runtime] window.__PROFITMAKER__ was already set before the host installed it — ' +
          'replacing it. Something other than the terminal is writing the host API global.',
      );
    }
    try {
      Object.defineProperty(window, '__PROFITMAKER__', {
        value: hostTerminal,
        writable: false,
        configurable: false,
        enumerable: true,
      });
    } catch (err) {
      // A non-configurable pre-existing property cannot be replaced. Modules
      // resolving the API off the global would get the squatter's object, so
      // this is fatal for the module system rather than something to paper over.
      console.error('[module-runtime] could not install window.__PROFITMAKER__:', err);
    }
  }

  return hostTerminal;
}

/**
 * A per-module view of the host API whose `widgets` calls are attributed to
 * `moduleId`. This is what a module's `register(terminal)` receives, and it is
 * the only widget surface with an authoritative owner — hence the only one that
 * can register the module's namespaced types.
 */
export function createModuleTerminal(moduleId: string): TerminalAPI {
  const host = initRuntime();
  const registry = () => useWidgetRegistry.getState();
  return Object.freeze({
    ...host,
    widgets: Object.freeze({
      register: (def) => void registry().register(def, moduleId),
      registerMany: (defs) => registry().registerMany(defs, moduleId),
      unregister: (type) => void registry().unregister(type, moduleId),
    }),
  });
}

/** Whether initRuntime() has run (the host TerminalAPI is built and installed). */
export function isRuntimeInitialized(): boolean {
  return hostTerminal !== null;
}
