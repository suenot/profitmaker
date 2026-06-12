// Runtime shim: @profitmaker/module-sdk inside a module bundle.
// Mirrors the public surface of src/client-runtime.ts in plain JS.

export function getTerminal() {
  const api = globalThis.__PROFITMAKER__;
  if (!api) {
    throw new Error(
      '[profitmaker-sdk] Terminal API not found. Module bundles must be loaded by the Profitmaker terminal.'
    );
  }
  return api;
}

export function defineModule(m) {
  return {
    id: m.id,
    async register(terminal) {
      if (m.widgets && m.widgets.length) {
        terminal.widgets.registerMany(m.widgets);
      }
      if (m.setup) await m.setup(terminal);
    },
    dispose: m.dispose,
  };
}

export const TERMINAL_API_VERSION = getTerminalApiVersionSafe();

function getTerminalApiVersionSafe() {
  try {
    return getTerminal().apiVersion;
  } catch {
    return '0.0.0';
  }
}

// Convenience hook re-exports delegating to the host implementation.
export function useWidgetGroup(groupId) {
  return getTerminal().hooks.useWidgetGroup(groupId);
}
export function useMarketData(opts) {
  return getTerminal().hooks.useMarketData(opts);
}
export function useModuleSocket(moduleId) {
  return getTerminal().hooks.useModuleSocket(moduleId);
}
