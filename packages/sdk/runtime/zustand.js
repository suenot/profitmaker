// Runtime shim: zustand from the host (single store runtime for host + modules).
const zustand = window.__PROFITMAKER__.zustand;
export const { create, createStore, useStore } = zustand;
export default zustand.create;
