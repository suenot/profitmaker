import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WidgetDefinition } from '@profitmaker/module-sdk';

import { useWidgetRegistry, HOST_OWNER } from './registry';

/**
 * The registry's ownership rules are a security boundary: a module that could
 * register the built-in `orderForm` type would be rendering its own UI where
 * the user expects the terminal's order entry.
 */

const def = (type: string): WidgetDefinition => ({
  type,
  title: type,
  defaultSize: { width: 100, height: 100 },
  Component: (() => null) as unknown as WidgetDefinition['Component'],
});

beforeEach(() => {
  useWidgetRegistry.setState({ definitions: {}, owners: {} });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('host registrations', () => {
  it('registers built-in (non-namespaced) types', () => {
    expect(useWidgetRegistry.getState().register(def('orderForm'))).toBe(true);
    expect(useWidgetRegistry.getState().getDefinition('orderForm')).toBeDefined();
    expect(useWidgetRegistry.getState().owners['orderForm']).toBe(HOST_OWNER);
  });

  it('lets the host replace its own type (e.g. the orderBook alias)', () => {
    useWidgetRegistry.getState().register(def('orderbook'));
    expect(useWidgetRegistry.getState().register({ ...def('orderbook'), title: 'v2' })).toBe(true);
    expect(useWidgetRegistry.getState().getDefinition('orderbook')?.title).toBe('v2');
  });
});

describe('module registrations', () => {
  it('accepts a type in the module\'s own namespace', () => {
    expect(useWidgetRegistry.getState().register(def('arbitrage.opportunities'), 'arbitrage')).toBe(true);
    expect(useWidgetRegistry.getState().owners['arbitrage.opportunities']).toBe('arbitrage');
  });

  it('refuses a non-namespaced type', () => {
    expect(useWidgetRegistry.getState().register(def('opportunities'), 'arbitrage')).toBe(false);
    expect(useWidgetRegistry.getState().getDefinition('opportunities')).toBeUndefined();
  });

  it('refuses another module\'s namespace', () => {
    expect(useWidgetRegistry.getState().register(def('other.widget'), 'arbitrage')).toBe(false);
    expect(useWidgetRegistry.getState().getDefinition('other.widget')).toBeUndefined();
  });

  it('cannot hijack a built-in type', () => {
    useWidgetRegistry.getState().register(def('orderForm'));
    const hijack = { ...def('orderForm'), title: 'Totally Real Order Form' };

    expect(useWidgetRegistry.getState().register(hijack, 'evil')).toBe(false);
    expect(useWidgetRegistry.getState().getDefinition('orderForm')?.title).toBe('orderForm');
  });

  it('cannot hijack a namespaced built-in type', () => {
    useWidgetRegistry.getState().register(def('system.moduleStore'));

    expect(useWidgetRegistry.getState().register(def('system.moduleStore'), 'system')).toBe(false);
    expect(useWidgetRegistry.getState().owners['system.moduleStore']).toBe(HOST_OWNER);
  });

  it('cannot take over another module\'s registered type', () => {
    useWidgetRegistry.getState().register(def('arbitrage.opportunities'), 'arbitrage');

    expect(useWidgetRegistry.getState().register(def('arbitrage.opportunities'), 'evil')).toBe(false);
    expect(useWidgetRegistry.getState().owners['arbitrage.opportunities']).toBe('arbitrage');
  });

  it('registerMany applies the same rules per definition', () => {
    useWidgetRegistry.getState().registerMany(
      [def('arbitrage.a'), def('chart'), def('arbitrage.b')],
      'arbitrage',
    );

    const { definitions } = useWidgetRegistry.getState();
    expect(Object.keys(definitions).sort()).toEqual(['arbitrage.a', 'arbitrage.b']);
  });
});

describe('unregister', () => {
  it('refuses to delete a type owned by someone else', () => {
    useWidgetRegistry.getState().register(def('chart'));

    expect(useWidgetRegistry.getState().unregister('chart', 'evil')).toBe(false);
    expect(useWidgetRegistry.getState().getDefinition('chart')).toBeDefined();
  });

  it('lets a module drop its own type', () => {
    useWidgetRegistry.getState().register(def('arbitrage.opportunities'), 'arbitrage');

    expect(useWidgetRegistry.getState().unregister('arbitrage.opportunities', 'arbitrage')).toBe(true);
    expect(useWidgetRegistry.getState().getDefinition('arbitrage.opportunities')).toBeUndefined();
  });
});

describe('unregisterByOwner', () => {
  it('removes exactly the types that module registered, including undeclared ones', () => {
    useWidgetRegistry.getState().register(def('chart'));
    useWidgetRegistry.getState().register(def('arbitrage.declared'), 'arbitrage');
    // Registered at runtime without appearing in the manifest's widget list.
    useWidgetRegistry.getState().register(def('arbitrage.undeclared'), 'arbitrage');
    useWidgetRegistry.getState().register(def('other.widget'), 'other');

    const removed = useWidgetRegistry.getState().unregisterByOwner('arbitrage');

    expect(removed.sort()).toEqual(['arbitrage.declared', 'arbitrage.undeclared']);
    expect(Object.keys(useWidgetRegistry.getState().definitions).sort()).toEqual([
      'chart',
      'other.widget',
    ]);
    expect(useWidgetRegistry.getState().owners['arbitrage.declared']).toBeUndefined();
  });

  it('is a no-op for a module that registered nothing', () => {
    useWidgetRegistry.getState().register(def('chart'));
    expect(useWidgetRegistry.getState().unregisterByOwner('ghost')).toEqual([]);
    expect(useWidgetRegistry.getState().getDefinition('chart')).toBeDefined();
  });
});
