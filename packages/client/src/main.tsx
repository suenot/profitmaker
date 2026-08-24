import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'
import { useBuiltinModulesStore } from './modules/builtinModules'
import { useUserModulesStore } from './modules/userModules'
import { loadModules } from './modules/loader'
import { initRuntime } from './modules/runtime'
import { start as startSyncBridge } from './services/syncBridge'
import { bootstrap as bootstrapSso, getSsoToken } from './services/ssoClient'
import { useSessionStore, getActiveSession } from './services/sessionManager'
import { useDataProviderStore } from './store/dataProviderStore'
import { initAccounts } from './store/accountStore'

// Populate the widget registry with all built-in widgets, then install the host
// Terminal API (window.__PROFITMAKER__) — both BEFORE the first render and
// before any module bundle is imported. loadModules() runs post-mount in App.
registerBuiltinWidgets();
initRuntime();

// Built-ins can be switched off in the Module Store; the off-list lives in the
// user's server-side settings. Read it as soon as a session is available — on a
// reload that is right now (cached session), on a fresh login it is the token
// transition handled below. Until it resolves every built-in stays registered,
// so the worst case is a widget briefly offered that the user had hidden.
void useBuiltinModulesStore.getState().hydrate();

// Same story for per-user module visibility (`modules.disabled`): the loader
// also consults it, and its post-load sweep re-applies it, so a hydrate that
// lands after a module bundle registers still hides that module's widgets.
void useUserModulesStore.getState().hydrate();

// SSO race recovery: market-data widgets mount and start fetching as soon as App
// renders — which can BEAT the async bootstrap on a fresh login (no cached
// session yet, cookie just set). Those first requests would 401 and the
// subscriptions would stall. A cached session (reload) is already surfaced
// SYNCHRONOUSLY by sessionManager.loadSessions(), so getSsoToken() returns it
// before any fetch. Watch for the active token transitioning absent -> present
// (bootstrap landing the session, or a manual switch) and restart any
// subscriptions that stalled while it was missing. ALSO watch for an identity
// quick-switch (setActiveSession): the token stays present throughout that pure
// SPA switch, so without this second trigger the new identity would keep the
// previous one's per-user hidden-module list and its toggles would write back
// to the old identity's setting.
let hadToken = !!getSsoToken();
let lastSessionId = getActiveSession()?.id ?? null;
useSessionStore.subscribe(() => {
  const hasToken = !!getSsoToken();
  const sessionId = getActiveSession()?.id ?? null;
  if ((hasToken && !hadToken) || (hasToken && sessionId !== null && sessionId !== lastSessionId)) {
    void useDataProviderStore.getState().restartInactiveSubscriptions();
    // Same transition: the built-in off-list and the per-user hidden-module
    // list are per-user settings, so they only become readable once a token
    // exists.
    void useBuiltinModulesStore.getState().hydrate();
    // Sequence visibility hydration BEFORE loadModules: the loader's load
    // filter reads the hidden list, and until the new identity's hydrate
    // resolves the store still holds the PREVIOUS identity's list. Loading
    // against that list would skip modules the old identity had hidden — an
    // under-registration nothing recovers in the live session (the post-load
    // sweep only unregisters). With the new list in place the filter reads
    // the right identity's preference. hydrate() never rejects (it swallows
    // fetch errors and still resolves), so the load always runs.
    void useUserModulesStore
      .getState()
      .hydrate()
      .finally(() => {
        // The previous identity may have had modules hidden at the time App's
        // post-mount loadModules() ran, which skips hidden modules entirely.
        // Safe to call repeatedly: concurrent calls share one in-flight
        // promise, and a completed run just re-registers the still-enabled
        // modules from the loader's bundle cache.
        void loadModules();
      });
  }
  hadToken = hasToken;
  lastSessionId = sessionId;
});

// Load the active identity's central exchange accounts on startup (and on every
// identity switch) so the Users/Balances/Trading-Data widgets populate without
// having to open the Accounts panel first. Covers both a cached session present
// synchronously on reload and a fresh-login session landed by bootstrap.
initAccounts();

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
