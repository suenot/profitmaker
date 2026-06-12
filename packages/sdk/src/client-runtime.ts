import type {
  TerminalAPI,
  WidgetDefinition,
  FrontendModule,
  WidgetGroupContext,
  UseMarketDataOptions,
  UseMarketDataResult,
  ModuleSocket,
} from './types';

/**
 * Access the host Terminal API from inside a module bundle.
 * The host guarantees `window.__PROFITMAKER__` exists before any module
 * bundle is imported.
 */
export function getTerminal(): TerminalAPI {
  const api = (globalThis as { __PROFITMAKER__?: TerminalAPI }).__PROFITMAKER__;
  if (!api) {
    throw new Error(
      '[profitmaker-sdk] Terminal API not found. Module bundles must be loaded by the Profitmaker terminal.'
    );
  }
  return api;
}

// ---------------------------------------------------------------------------
// Convenience hook re-exports.
//
// These delegate to `getTerminal().hooks.*`. They exist so a module can write
// the bare import `import { useMarketData } from '@profitmaker/module-sdk'` and
// have it BOTH typecheck (against these signatures) and build (the vite preset
// aliases the SDK to runtime/sdk.js, which provides the same named exports).
// Keep this surface mirrored with runtime/sdk.js. They are real React hooks —
// call them unconditionally at the top of a component.
// ---------------------------------------------------------------------------

/** Resolve a widget's group into exchange/symbol/market/account context. */
export function useWidgetGroup(groupId?: string): WidgetGroupContext {
  return getTerminal().hooks.useWidgetGroup(groupId);
}

/** Subscribe to market data for the lifetime of the component (ref-counted). */
export function useMarketData(opts: UseMarketDataOptions): UseMarketDataResult {
  return getTerminal().hooks.useMarketData(opts);
}

/** Socket.IO connection to a module's backend namespace (`/m/<moduleId>`). */
export function useModuleSocket(moduleId: string): ModuleSocket | null {
  return getTerminal().hooks.useModuleSocket(moduleId);
}

/**
 * Define a frontend module. The default export of a module's frontend entry:
 *
 *   export default defineModule({ id: 'arbitrage', widgets: [OpportunitiesWidget] });
 */
export function defineModule(m: {
  id: string;
  widgets?: WidgetDefinition[];
  setup?: (terminal: TerminalAPI) => void | Promise<void>;
  dispose?: () => void;
}): FrontendModule {
  return {
    id: m.id,
    async register(terminal: TerminalAPI) {
      if (m.widgets?.length) {
        terminal.widgets.registerMany(m.widgets);
      }
      await m.setup?.(terminal);
    },
    dispose: m.dispose,
  };
}
