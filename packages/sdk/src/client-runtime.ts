import type { TerminalAPI, WidgetDefinition, FrontendModule } from './types';

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
