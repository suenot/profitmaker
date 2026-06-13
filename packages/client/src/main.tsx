import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'
import { initRuntime } from './modules/runtime'
import { start as startSyncBridge } from './services/syncBridge'
import { bootstrap as bootstrapSso, getSsoToken } from './services/ssoClient'
import { useSessionStore } from './services/sessionManager'
import { useDataProviderStore } from './store/dataProviderStore'

// Populate the widget registry with all built-in widgets, then install the host
// Terminal API (window.__PROFITMAKER__) — both BEFORE the first render and
// before any module bundle is imported. loadModules() runs post-mount in App.
registerBuiltinWidgets();
initRuntime();

// SSO race recovery: market-data widgets mount and start fetching as soon as App
// renders — which can BEAT the async bootstrap on a fresh login (no cached
// session yet, cookie just set). Those first requests would 401 and the
// subscriptions would stall. A cached session (reload) is already surfaced
// SYNCHRONOUSLY by sessionManager.loadSessions(), so getSsoToken() returns it
// before any fetch. For the fresh-login case, watch for the active token
// transitioning absent -> present (bootstrap landing the session, or a manual
// switch) and restart any subscriptions that stalled while it was missing.
let hadToken = !!getSsoToken();
useSessionStore.subscribe(() => {
  const hasToken = !!getSsoToken();
  if (hasToken && !hadToken) {
    void useDataProviderStore.getState().restartInactiveSubscriptions();
  }
  hadToken = hasToken;
});

// Resolve an ecosystem SSO session (shared *.marketmaker.cc cookie) BEFORE the
// sync bridge connects, so it presents the SSO token. Non-blocking and tolerant
// of an unreachable auth service — the bridge falls back to API_TOKEN/dev token.
// When bootstrap lands a fresh-login session, the subscription above recovers
// any market-data fetches that raced ahead of it.
bootstrapSso().finally(() => {
  startSyncBridge();
  // Belt-and-suspenders: the store subscription above fires on the token
  // transition, but a request that was mid-flight at that instant may flip its
  // subscription to inactive a tick later. Once bootstrap has settled and a
  // token is present, sweep any still-inactive subscriptions one more time.
  if (getSsoToken()) {
    void useDataProviderStore.getState().restartInactiveSubscriptions();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
