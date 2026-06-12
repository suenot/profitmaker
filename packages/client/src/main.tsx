import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'
import { initRuntime } from './modules/runtime'

// Populate the widget registry with all built-in widgets, then install the host
// Terminal API (window.__PROFITMAKER__) — both BEFORE the first render and
// before any module bundle is imported. loadModules() runs post-mount in App.
registerBuiltinWidgets();
initRuntime();

createRoot(document.getElementById("root")!).render(<App />);
