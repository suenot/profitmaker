import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'
import { initRuntime } from './modules/runtime'
import { start as startSyncBridge } from './services/syncBridge'
import { bootstrap as bootstrapSso } from './services/ssoClient'

// Populate the widget registry with all built-in widgets, then install the host
// Terminal API (window.__PROFITMAKER__) — both BEFORE the first render and
// before any module bundle is imported. loadModules() runs post-mount in App.
registerBuiltinWidgets();
initRuntime();

// Resolve an ecosystem SSO session (shared *.marketmaker.cc cookie) BEFORE the
// sync bridge connects, so it presents the SSO token. Non-blocking and tolerant
// of an unreachable auth service — the bridge falls back to API_TOKEN/dev token.
bootstrapSso().finally(() => startSyncBridge());

createRoot(document.getElementById("root")!).render(<App />);
