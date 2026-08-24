import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { WidgetDefinition } from '@profitmaker/module-sdk';

import { moduleFetch } from './api';
import { useUserModulesStore, applyModuleVisibility } from './userModules';
import { useWidgetRegistry } from './registry';

/**
 * Per-user module visibility is a registry-level security surface like the
 * ownership rules in registry.test.ts: hiding must remove exactly the hidden
 * module's widget types (never another owner's), persist through the user's
 * settings, and never leave the store and the registry out of step when a
 * write fails.
 */

vi.mock('./api', () => ({ moduleFetch: vi.fn() }));

const fetchMock = vi.mocked(moduleFetch);

const def = (type: string): WidgetDefinition => ({
  type,
  title: type,
  defaultSize: { width: 100, height: 100 },
  Component: (() => null) as unknown as WidgetDefinition['Component'],
});

const okSettings = (value: unknown) =>
  new Response(JSON.stringify({ data: { value } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

/** The PUT body the last moduleFetch call sent. */
const lastPutValue = (): unknown => {
  const init = fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1] as RequestInit;
  return JSON.parse(init.body as string);
};

beforeEach(() => {
  useWidgetRegistry.setState({ definitions: {}, owners: {} });
  useUserModulesStore.setState({ disabled: [], hydrated: false, busyId: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fetchMock.mockReset();
});

describe('hydrate', () => {
  it('applies the disabled list: the hidden module\'s types are unregistered, others stay', async () => {
    useWidgetRegistry.getState().register(def('arbitrage.a'), 'arbitrage');
    useWidgetRegistry.getState().register(def('arbitrage.b'), 'arbitrage');
    useWidgetRegistry.getState().register(def('other.widget'), 'other');
    fetchMock.mockResolvedValue(okSettings(['arbitrage']));

    await useUserModulesStore.getState().hydrate();

    expect(useUserModulesStore.getState().hydrated).toBe(true);
    expect(useUserModulesStore.getState().disabled).toEqual(['arbitrage']);
    expect(useWidgetRegistry.getState().getDefinition('arbitrage.a')).toBeUndefined();
    expect(useWidgetRegistry.getState().getDefinition('arbitrage.b')).toBeUndefined();
    expect(useWidgetRegistry.getState().getDefinition('other.widget')).toBeDefined();
  });

  it('treats a 404 as "nothing hidden" and still hydrates', async () => {
    fetchMock.mockResolvedValue(new Response('not found', { status: 404 }));

    await useUserModulesStore.getState().hydrate();

    expect(useUserModulesStore.getState().hydrated).toBe(true);
    expect(useUserModulesStore.getState().disabled).toEqual([]);
  });
});

describe('setEnabled', () => {
  it('hiding unregisters the module\'s widgets and PUTs the setting', async () => {
    useWidgetRegistry.getState().register(def('arbitrage.a'), 'arbitrage');
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await useUserModulesStore.getState().setEnabled('arbitrage', false);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/settings/modules.disabled',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(lastPutValue()).toEqual({ value: ['arbitrage'] });
    expect(useUserModulesStore.getState().isHidden('arbitrage')).toBe(true);
    expect(useUserModulesStore.getState().busyId).toBeNull();
    expect(useWidgetRegistry.getState().getDefinition('arbitrage.a')).toBeUndefined();
  });

  it('rolls the store AND the registry back when the PUT fails', async () => {
    const widget = def('arbitrage.a');
    useWidgetRegistry.getState().register(widget, 'arbitrage');
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));

    await expect(
      useUserModulesStore.getState().setEnabled('arbitrage', false),
    ).rejects.toThrow('PUT settings -> 500');

    expect(useUserModulesStore.getState().disabled).toEqual([]);
    expect(useUserModulesStore.getState().isHidden('arbitrage')).toBe(false);
    expect(useUserModulesStore.getState().busyId).toBeNull();
    expect(useWidgetRegistry.getState().getDefinition('arbitrage.a')).toBe(widget);
    expect(useWidgetRegistry.getState().owners['arbitrage.a']).toBe('arbitrage');
  });

  it('un-hiding clears the entry and persists the remaining list', async () => {
    useUserModulesStore.setState({ disabled: ['arbitrage', 'other'] });
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));

    await useUserModulesStore.getState().setEnabled('arbitrage', true);

    expect(useUserModulesStore.getState().disabled).toEqual(['other']);
    expect(useUserModulesStore.getState().isHidden('arbitrage')).toBe(false);
    expect(lastPutValue()).toEqual({ value: ['other'] });
  });
});

describe('applyModuleVisibility', () => {
  it('is idempotent and leaves other owners alone', () => {
    useWidgetRegistry.getState().register(def('arbitrage.a'), 'arbitrage');
    useWidgetRegistry.getState().register(def('chart'));
    useUserModulesStore.setState({ disabled: ['arbitrage'] });

    applyModuleVisibility();
    applyModuleVisibility();

    expect(useWidgetRegistry.getState().getDefinition('arbitrage.a')).toBeUndefined();
    expect(useWidgetRegistry.getState().owners['arbitrage.a']).toBeUndefined();
    expect(useWidgetRegistry.getState().getDefinition('chart')).toBeDefined();
  });
});
