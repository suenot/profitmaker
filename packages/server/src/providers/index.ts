import { providerRegistry } from './registry';
import { ccxtProviderFactory } from './ccxtProvider';

export { providerRegistry } from './registry';
export type { ServerProviderRegistry } from './registry';
export { ccxtProviderFactory } from './ccxtProvider';

/**
 * Register the providers that ship with the terminal. Today that's just the
 * built-in 'ccxt' (the default, lowest-priority, all-exchanges provider).
 * Call once at server boot, before any /api/exchange request is served.
 */
export function registerBuiltinProviders(): void {
  if (!providerRegistry.has(ccxtProviderFactory.id)) {
    providerRegistry.register(ccxtProviderFactory);
  }
}
