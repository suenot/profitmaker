import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'
import { initRuntime } from './modules/runtime'
import { start as startSyncBridge } from './services/syncBridge'

// Populate the widget registry with all built-in widgets, then install the host
// Terminal API (window.__PROFITMAKER__) — both BEFORE the first render and
// before any module bundle is imported. loadModules() runs post-mount in App.
registerBuiltinWidgets();
initRuntime();

// Connect dashboards/groups to the server for real-time, backend-driven control.
// Safe to call when the server is unreachable — it retries in the background and
// the terminal keeps working off localStorage until it connects.
startSyncBridge();

createRoot(document.getElementById("root")!).render(<App />);
