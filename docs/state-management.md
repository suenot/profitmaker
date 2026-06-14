# State Management

## Overview

Profitmaker uses **Zustand 5** for global state management. Each domain has its own store file. Stores use middleware for immutable updates (Immer), persistence (localStorage), and reactive subscriptions.

## Store Architecture

```
src/store/
├── dashboardStore.ts          # Dashboards and widgets
├── accountStore.ts            # Central (SSO-vault) exchange accounts
├── userStore.ts               # Back-compat projection of accountStore + sessions
├── dataProviderStore.ts       # Data providers, subscriptions, market data
├── groupStore.ts              # Widget groups (shared context)
├── chartWidgetStore.ts        # Per-widget chart settings
├── orderBookWidgetStore.ts    # Per-widget orderbook settings
├── tradesWidgetStore.ts       # Per-widget trades settings
├── orderFormWidgetStore.ts    # Per-widget order form settings
├── userBalancesWidgetStore.ts # Per-widget balance settings
├── userTradingDataWidgetStore.ts # Per-widget trading data settings
├── dealsStore.ts              # Deals (grouped fills) per widget
├── placeOrderStore.ts         # Order form state
├── notificationStore.ts       # Toast/notification queue
├── settingsDrawerStore.ts     # Settings panel open/close state
├── types.ts                   # DataProviderStore type definitions
├── actions/                   # Split action modules for dataProviderStore
│   ├── providerActions.ts
│   ├── subscriptionActions.ts
│   ├── dataActions.ts
│   ├── fetchingActions.ts
│   ├── ccxtActions.ts
│   └── eventActions.ts
├── providers/                 # Provider implementation helpers
└── utils/                     # Store utility functions

src/services/
├── sessionManager.ts          # Multi-login SSO session state (localStorage)
├── ssoClient.ts               # SSO bootstrap / login / logout façade
├── syncBridge.ts              # Server <-> store sync over Socket.IO
└── orderExecutionService.ts   # Order placement helper
```

## Core Stores

### dashboardStore

Manages dashboards and their widgets. Persisted to `dashboard-store` in localStorage.

**State:**
```typescript
{
  dashboards: Dashboard[];       // All dashboards
  activeDashboardId?: string;    // Currently visible dashboard
}
```

**Key actions:**
- `addDashboard(data)` / `removeDashboard(id)` / `duplicateDashboard(id)`
- `setActiveDashboard(id)`
- `addWidget(dashboardId, widget)` / `removeWidget(dashboardId, widgetId)`
- `moveWidget(dashboardId, widgetId, x, y)`
- `resizeWidget(dashboardId, widgetId, width, height)`
- `bringWidgetToFront(dashboardId, widgetId)`
- `toggleWidgetVisibility(dashboardId, widgetId)`
- `toggleWidgetMinimized(dashboardId, widgetId)`
- `updateWidgetTitle(dashboardId, widgetId, userTitle)`

**Middleware:** `persist` + `immer`

On first load, `initializeWithDefault()` creates a default dashboard with Chart, Portfolio, Order Form, and Transaction History widgets.

### Multi-login & SSO (services)

Authentication and identity live in `src/services`, not the stores:

- **`sessionManager.ts`** — holds N simultaneous ecosystem SSO sessions (one
  active) in a Zustand store persisted to localStorage under
  `profitmaker.sso.sessions`. Each session is `{ id, token, user, addedAt,
  expiresAt }`. `getSsoToken()` returns the **active** session's token, so every
  downstream consumer (accountStore, syncBridge, the data providers) follows the
  active identity automatically. Helpers: `getActiveSession()`,
  `upsertSession()`, `setActiveSession()` (quick-switch), `removeSession()`,
  `clearAllSessions()`, `isSessionStale()` (JWT past `exp`). The legacy single
  token at `profitmaker.sso.token` is migrated into a session on first load.
- **`ssoClient.ts`** — a thin façade over `sessionManager` for the SSO lifecycle:
  `bootstrap()` (silently exchanges the shared `*.marketmaker.cc` cookie for a
  JWT at startup), `login()` / `addLogin()` (the latter forces a fresh credential
  prompt to add a second identity), `switchSession()`, `logout()` /
  `logoutAll()`. `useSsoStore()` projects the active-session view for components.

### accountStore

Loads **central exchange accounts** for the active SSO identity from the server
proxy `GET /api/accounts` (which forwards to the auth vault). **No secrets ever
live in the browser** — only metadata (id, exchange, label, read_only,
access_level, shared, …).

**State:**
```typescript
{
  accountsBySession: Record<string, ExchangeAccount[]>;  // keyed by session id
  loading: boolean;
  error: string | null;
}
```

**Key actions:**
- `loadAccounts()` -- GET `/api/accounts` for the active identity
- `addAccount(input)` -- POST keys to the vault, then reloads the list
- `removeAccount(accountId)` -- DELETE `/api/accounts/:id`
- `listGrants()` / `shareAccount()` / `revokeGrant()` -- account sharing
- `migrateLegacyLocalAccounts()` -- one-time push of any old localStorage keys up to auth

`initAccounts()` is called once on startup (`main.tsx`) to load the active
identity's accounts and refresh them on every session add/switch/remove. The
account `id` (credential id) is what links a group to a credential
(`group.account = id`); widgets gate on `acc => !!acc.id`.

### userStore (back-compat shim)

`userStore` no longer owns any data. It is a **reactive projection** of
`sessionManager` (identities) + `accountStore` (their accounts) onto the historic
`{ users, activeUserId, ExchangeAccount }` shape that existing widgets and
selectors still program against. It subscribes to both and recomputes
`users` / `activeUserId` whenever either changes.

The old in-browser AES path and master-password flow are **gone** — there are no
secrets in the browser to lock. The legacy encryption fields (`isLocked`,
`needsMasterPassword`, `unlockStore`, …) remain as inert shims so old callers
still compile; the store reports itself permanently unlocked.

### dataProviderStore

The largest and most complex store. Manages data providers, subscriptions, and all market data.

**State:**
```typescript
{
  providers: Record<string, DataProvider>;
  activeProviderId: string | null;  // Deprecated, kept for compat
  dataFetchSettings: {
    method: 'websocket' | 'rest';
    restIntervals: {
      trades: 1000,     // ms
      candles: 5000,
      orderbook: 500,
      balance: 30000,
      ticker: 600000
    }
  };
  activeSubscriptions: Record<string, ActiveSubscription>;
  restCycles: Record<string, RestCycleManager>;
  marketData: {
    candles: { [exchange][market][symbol][timeframe]: Candle[] };
    trades: { [exchange][market][symbol]: Trade[] };
    orderbook: { [exchange][market][symbol]: OrderBook };
    balance: { [accountId][walletType]: ExchangeBalances };
    ticker: { [exchange][market][symbol]: Ticker };
  };
  chartUpdateListeners: Record<string, ChartUpdateListener[]>;
}
```

**Key action categories:**

Provider management:
- `addProvider()` / `removeProvider()` / `createProvider()`
- `getProviderForExchange(exchange)` -- finds best provider by priority

Subscriptions (with deduplication):
- `subscribe(subscriberId, exchange, symbol, dataType, timeframe?, market?)`
- `unsubscribe(subscriberId, exchange, symbol, dataType, timeframe?, market?)`

Data retrieval:
- `getCandles(exchange, symbol, timeframe?, market?)`
- `getTrades(exchange, symbol, market?)`
- `getOrderBook(exchange, symbol, market?)`
- `getBalance(accountId, walletType?)`
- `getTicker(exchange, symbol, market?, maxAge?)`

Data initialization (REST fetch on widget mount):
- `initializeChartData()` / `initializeTradesData()` / `initializeOrderBookData()`
- `initializeBalanceData()` / `initializeTickerData()`
- `loadHistoricalCandles()` -- for infinite scroll

**Middleware:** `persist` + `subscribeWithSelector` + `immer`

Only provider configs and fetch settings are persisted. Market data is NOT persisted.

**Actions are split** into separate files in `store/actions/` for maintainability:
- `providerActions.ts` -- provider CRUD
- `subscriptionActions.ts` -- subscribe/unsubscribe with ref counting
- `dataActions.ts` -- data retrieval and updates
- `fetchingActions.ts` -- REST/WebSocket fetching logic
- `ccxtActions.ts` -- CCXT-specific operations
- `eventActions.ts` -- chart update event system

### groupStore

Manages widget groups that share trading context.

**State:**
```typescript
{
  groups: Group[];
  selectedGroupId?: string;
}
```

**Key actions:**
- `createGroup(data)` / `deleteGroup(id)`
- `selectGroup(groupId)`
- `setExchange(groupId, exchange)` / `setMarket(groupId, market)`
- `setTradingPair(groupId, pair)` / `setAccount(groupId, account)`

## Patterns

### Middleware Stack

Most stores use this pattern:

```typescript
export const useMyStore = create<MyStore>()(
  persist(
    immer((set, get) => ({
      // state + actions
    })),
    {
      name: 'my-store',           // localStorage key
      partialize: (state) => ({   // only persist what matters
        field1: state.field1,
      }),
      merge: (persisted, current) => {
        // Validate with Zod on load
        try {
          const parsed = MySchema.parse(persisted);
          return { ...current, ...parsed };
        } catch {
          return current;  // invalid data -> use defaults
        }
      },
    }
  )
);
```

### Selectors

Always use selectors to minimize re-renders:

```typescript
// Good -- only re-renders when activeDashboardId changes
const id = useDashboardStore(s => s.activeDashboardId);

// Bad -- re-renders on ANY store change
const store = useDashboardStore();
```

### Immer Updates

Immer lets you write "mutable" code that produces immutable updates:

```typescript
set((state) => {
  const widget = state.dashboards
    .find(d => d.id === dashboardId)
    ?.widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.position.x = newX;  // looks mutable, but Immer handles it
    widget.position.y = newY;
  }
});
```

### Zod Validation on Rehydration

Stores validate persisted data with Zod schemas on load. If the schema doesn't match (e.g., after a code update changes the shape), the store falls back to defaults instead of crashing:

```typescript
merge: (persisted, current) => {
  try {
    const parsed = DashboardStoreStateSchema.parse(persisted);
    return { ...current, ...parsed };
  } catch {
    return current;
  }
},
```

### enableMapSet

The dataProviderStore uses `enableMapSet()` from Immer to support Map and Set in state updates (used for subscription tracking).
