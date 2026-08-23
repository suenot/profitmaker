import type {
  Candle,
  Trade,
  OrderBook,
  Ticker,
  DataType,
  Timeframe,
  MarketType,
  ServerProviderFactory,
} from '@profitmaker/types';
import type * as ReactNS from 'react';

/**
 * Version of the host extension API. Modules declare a compatible semver
 * range via `profitmaker.minTerminalApi` in their manifest.
 */
export const TERMINAL_API_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// Frontend: widget definitions
// ---------------------------------------------------------------------------

export interface WidgetProps {
  widgetId: string;
  /** Group the widget belongs to (shared exchange/symbol/market/account context) */
  groupId?: string;
  /** Per-widget persisted config (stored on the dashboard) */
  config: Record<string, unknown>;
  updateConfig: (patch: Record<string, unknown>) => void;
}

export interface WidgetSettingsProps {
  widgetId: string;
  groupId?: string;
}

export interface WidgetDefinition {
  /** Built-in: 'chart' | ... — module widgets: '<moduleId>.<widgetName>' */
  type: string;
  /** Default widget title shown in the header and the add-widget menu */
  title: string;
  /** lucide-react icon name; host resolves it, falls back to a puzzle icon */
  icon?: string;
  /** Menu section: 'public' | 'private' | 'diagnostics' | 'system' | 'modules' | custom */
  category?: string;
  defaultSize: { width: number; height: number };
  /** Show the group-selector circle in the widget header (default true) */
  showGroupSelector?: boolean;
  /** Auto-assign the transparent group on creation (default false) */
  needsTransparentGroup?: boolean;
  Component: ReactNS.ComponentType<WidgetProps>;
  /** Optional settings panel rendered in the settings drawer */
  Settings?: ReactNS.ComponentType<WidgetSettingsProps>;
  /** Optional extra buttons rendered in the widget header */
  HeaderActions?: ReactNS.ComponentType<{ widgetId: string }>;
}

export interface FrontendModule {
  id: string;
  register(terminal: TerminalAPI): void | Promise<void>;
  dispose?(): void;
}

// ---------------------------------------------------------------------------
// Frontend: the host-provided Terminal API (window.__PROFITMAKER__)
// ---------------------------------------------------------------------------

export interface WidgetGroupContext {
  exchange?: string;
  symbol?: string;
  market?: MarketType;
  account?: string;
  /** true when exchange+symbol are both set and data can be subscribed */
  isComplete: boolean;
}

export interface UseMarketDataOptions {
  exchange: string;
  symbol: string;
  dataType: DataType;
  timeframe?: Timeframe;
  market?: MarketType;
  /** Unique subscriber id; defaults to the calling widget id when omitted */
  subscriberId: string;
}

export interface UseMarketDataResult {
  candles?: Candle[];
  trades?: Trade[];
  orderbook?: OrderBook | null;
  ticker?: Ticker | null;
}

/** Minimal structural type for a socket.io-client Socket (avoids a hard dependency) */
export interface ModuleSocket {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  off(event: string, listener?: (...args: unknown[]) => void): unknown;
  emit(event: string, ...args: unknown[]): unknown;
  disconnect(): unknown;
  connected: boolean;
}

export interface TerminalNotify {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
}

export interface TerminalAPI {
  apiVersion: string;

  /** Host singletons — module bundles import these via SDK runtime shims */
  React: unknown;
  ReactDOM: unknown;
  ReactDOMClient: unknown;
  jsxRuntime: unknown;
  jsxDevRuntime: unknown;
  zustand: unknown;

  widgets: {
    register(def: WidgetDefinition): void;
    registerMany(defs: WidgetDefinition[]): void;
    unregister(type: string): void;
  };

  /**
   * Host Zustand stores (bound hooks). Typed loosely here; the data-access
   * surface modules should prefer is `hooks` below.
   */
  stores: {
    useDataProviderStore: unknown;
    useGroupStore: unknown;
    useDashboardStore: unknown;
    useSettingsDrawerStore: unknown;
  };

  hooks: {
    /** Resolve a widget's group into exchange/symbol/market/account context */
    useWidgetGroup(groupId?: string): WidgetGroupContext;
    /** Subscribe to market data for the lifetime of the component (ref-counted) */
    useMarketData(opts: UseMarketDataOptions): UseMarketDataResult;
    /** Socket.IO connection to this module's backend namespace (/m/<moduleId>) */
    useModuleSocket(moduleId: string): ModuleSocket | null;
  };

  api: {
    /** Authenticated fetch against the terminal server, path like '/api/modules/arbitrage/scan' */
    fetch(path: string, init?: RequestInit): Promise<Response>;
    baseUrl: string;
  };

  notify: TerminalNotify;
}

declare global {
  interface Window {
    __PROFITMAKER__?: TerminalAPI;
  }
}

// ---------------------------------------------------------------------------
// Backend: module contract
// ---------------------------------------------------------------------------

/**
 * Structural stand-in for an Elysia instance. Module authors return a real
 * `new Elysia()` (their own dependency); the host mounts it under
 * `/api/modules/<id>`. Kept structural so the SDK has no hard elysia dep.
 */
export interface ElysiaLikePlugin {
  handle(request: Request): Response | Promise<Response>;
}

/** Minimal structural type for a socket.io server Namespace */
export interface ModuleSocketNamespace {
  emit(event: string, ...args: unknown[]): boolean;
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

export interface ModuleStorage {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  all(): Promise<Record<string, unknown>>;
}

export interface Disposable {
  dispose(): void;
}

export interface ModuleJobs {
  /** Run fn every `ms` milliseconds; auto-cleared when the module stops */
  every(ms: number, fn: () => void | Promise<void>, name?: string): Disposable;
  /** Run fn once after `ms` milliseconds; auto-cleared when the module stops */
  once(ms: number, fn: () => void | Promise<void>): Disposable;
}

export interface ModuleLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Runtime context the host hands to a backend module's `start()`.
 *
 * ## Caller identity
 *
 * Routes mounted by this module receive two host-minted headers on every
 * request: `x-pm-user-id` (the local terminal user id) and, when the caller
 * has an auth-service identity, `x-pm-user-auth-id` (the auth.marketmaker.cc
 * user id). They are present only for session/SSO callers and ABSENT for
 * server-to-server (API_TOKEN) calls. Client-supplied `x-pm-user-*` values are
 * stripped by the host before dispatch — never trust a value you did not get
 * from the host; only the host's are real.
 */
export interface BackendModuleContext {
  id: string;
  version: string;
  log: ModuleLogger;
  /** Mounted route prefix: '/api/modules/<id>' */
  routesPrefix: string;
  /** Socket.IO namespace '/m/<id>' on the terminal's socket server */
  io: ModuleSocketNamespace;
  /**
   * Shared server-side CCXT access (same instance cache and rate-limit
   * budgets as the terminal itself). The return value is a ccxt exchange.
   */
  ccxt: {
    getInstance(config: {
      exchangeId: string;
      marketType?: string;
      sandbox?: boolean;
      apiKey?: string;
      secret?: string;
      password?: string;
    }): Promise<unknown>;
  };
  /**
   * Register additional server-side data/trading providers (e.g. a Rust napi
   * binding shipped in this module's npm package). Registered providers are
   * resolved by /api/exchange/* and the watch loop alongside the built-in
   * 'ccxt'. All of a module's providers are auto-unregistered on stop/disable.
   */
  providers: {
    register(factory: ServerProviderFactory): Disposable;
    unregister(id: string): boolean;
  };
  /** Per-module persisted JSON storage */
  storage: ModuleStorage;
  /** Tracked background jobs — force-cleared on stop()/disable */
  jobs: ModuleJobs;
  env: {
    dataDir: string;
  };
}

export interface BackendModuleHandles {
  /** Elysia plugin with routes relative to root; host mounts under /api/modules/<id> */
  routes?: ElysiaLikePlugin;
}

export interface BackendModule {
  start(ctx: BackendModuleContext): Promise<BackendModuleHandles | void>;
  stop?(): Promise<void>;
}
