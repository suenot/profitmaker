// Runtime shim: react-dom/client from the host.
const ReactDOMClient = window.__PROFITMAKER__.ReactDOMClient;
export default ReactDOMClient;
export const { createRoot, hydrateRoot } = ReactDOMClient;
