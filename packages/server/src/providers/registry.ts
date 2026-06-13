import type {
  ServerProviderFactory,
  ServerProviderInstance,
  ProviderRequestConfig,
  AvailableProvider,
} from '@profitmaker/types';

/**
 * Registry of server-side data/trading providers. /api/exchange/* and the
 * Socket.IO watch loop resolve a provider through here instead of calling CCXT
 * directly, so the terminal can serve from the built-in 'ccxt' or any
 * module-supplied provider (e.g. a Rust napi binding).
 */
class ServerProviderRegistry {
  private factories = new Map<string, ServerProviderFactory>();
  /** Maps providerId → owning module id, for auto-unregister + listing. */
  private moduleOwners = new Map<string, string>();

  /**
   * Register a provider factory. `moduleId` is set when the provider comes from
   * an installed module (used for auto-unregister on module stop and for the
   * `fromModule` field in /api/providers/available).
   */
  register(factory: ServerProviderFactory, moduleId?: string): void {
    if (this.factories.has(factory.id)) {
      throw new Error(`provider '${factory.id}' is already registered`);
    }
    this.factories.set(factory.id, factory);
    if (moduleId) this.moduleOwners.set(factory.id, moduleId);
  }

  unregister(id: string): boolean {
    this.moduleOwners.delete(id);
    return this.factories.delete(id);
  }

  /** Remove every provider owned by a module (called on module stop/disable). */
  unregisterModule(moduleId: string): string[] {
    const removed: string[] = [];
    for (const [providerId, owner] of this.moduleOwners) {
      if (owner === moduleId) {
        this.factories.delete(providerId);
        this.moduleOwners.delete(providerId);
        removed.push(providerId);
      }
    }
    return removed;
  }

  has(id: string): boolean {
    return this.factories.has(id);
  }

  get(id: string): ServerProviderFactory | undefined {
    return this.factories.get(id);
  }

  private supports(factory: ServerProviderFactory, exchange: string): boolean {
    return factory.supportedExchanges === '*' || factory.supportedExchanges.includes(exchange);
  }

  /**
   * Resolve the factory that should serve `exchange`. If `explicitProviderId` is
   * given it must exist and support the exchange; otherwise the highest-priority
   * (lowest `priority` number) registered provider supporting the exchange wins.
   */
  resolveFactory(exchange: string, explicitProviderId?: string): ServerProviderFactory {
    if (explicitProviderId) {
      const factory = this.factories.get(explicitProviderId);
      if (!factory) throw new Error(`provider '${explicitProviderId}' not found`);
      if (!this.supports(factory, exchange)) {
        throw new Error(`provider '${explicitProviderId}' does not support exchange '${exchange}'`);
      }
      return factory;
    }

    const candidates = Array.from(this.factories.values())
      .filter((f) => this.supports(f, exchange))
      .sort((a, b) => a.priority - b.priority);

    if (candidates.length === 0) {
      throw new Error(`no provider supports exchange '${exchange}'`);
    }
    return candidates[0];
  }

  /**
   * Resolve + instantiate a provider for a request config. Returns the live
   * instance plus the resolved provider id (so callers can echo it in the
   * response `provider` field).
   */
  async resolve(
    config: ProviderRequestConfig,
    explicitProviderId?: string,
  ): Promise<{ instance: ServerProviderInstance; providerId: string }> {
    const factory = this.resolveFactory(config.exchangeId, explicitProviderId);
    const instance = await factory.create(config);
    return { instance, providerId: factory.id };
  }

  /** Public listing for GET /api/providers/available. */
  list(): AvailableProvider[] {
    return Array.from(this.factories.values())
      .sort((a, b) => a.priority - b.priority)
      .map((f) => ({
        id: f.id,
        displayName: f.displayName,
        exchanges: f.supportedExchanges,
        priority: f.priority,
        fromModule: this.moduleOwners.get(f.id),
      }));
  }
}

/** Process-wide singleton registry. */
export const providerRegistry = new ServerProviderRegistry();
export type { ServerProviderRegistry };
