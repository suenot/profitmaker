import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { registerBuiltinWidgets } from './modules/builtinWidgets'

// Populate the widget registry with all built-in widgets before the first render.
registerBuiltinWidgets();

createRoot(document.getElementById("root")!).render(<App />);
