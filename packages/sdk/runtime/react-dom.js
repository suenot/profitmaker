// Runtime shim: react-dom from the host.
const ReactDOM = window.__PROFITMAKER__.ReactDOM;
export default ReactDOM;
export const { createPortal, flushSync, version } = ReactDOM;
