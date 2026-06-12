import { create } from 'zustand';
import type { WidgetDefinition } from '@profitmaker/module-sdk';

/**
 * Dynamic widget registry.
 *
 * Holds every renderable widget definition keyed by `type`. Built-in widgets
 * register here at startup (see `builtinWidgets.tsx`); module widgets register
 * at load time via the host Terminal API.
 *
 * NOTE: this store is intentionally a plain `create()` with NO persist
 * middleware — definitions carry live React components and cannot be
 * serialised. Persistence of *which* widgets exist on a dashboard lives in the
 * dashboard store; the registry only maps a `type` string to its definition.
 */
interface WidgetRegistryState {
  definitions: Record<string, WidgetDefinition>;
  register: (def: WidgetDefinition) => void;
  registerMany: (defs: WidgetDefinition[]) => void;
  unregister: (type: string) => void;
  getDefinition: (type: string) => WidgetDefinition | undefined;
  /** All definitions in a category, in registration order. */
  listByCategory: (category: string) => WidgetDefinition[];
}

export const useWidgetRegistry = create<WidgetRegistryState>((set, get) => ({
  definitions: {},

  register: (def) =>
    set((state) => {
      if (state.definitions[def.type]) {
        console.warn(
          `[WidgetRegistry] Re-registering widget type "${def.type}" — replacing existing definition.`
        );
      }
      return { definitions: { ...state.definitions, [def.type]: def } };
    }),

  registerMany: (defs) =>
    set((state) => {
      const next = { ...state.definitions };
      for (const def of defs) {
        if (next[def.type]) {
          console.warn(
            `[WidgetRegistry] Re-registering widget type "${def.type}" — replacing existing definition.`
          );
        }
        next[def.type] = def;
      }
      return { definitions: next };
    }),

  unregister: (type) =>
    set((state) => {
      if (!state.definitions[type]) return state;
      const next = { ...state.definitions };
      delete next[type];
      return { definitions: next };
    }),

  getDefinition: (type) => get().definitions[type],

  listByCategory: (category) =>
    Object.values(get().definitions).filter((def) => def.category === category),
}));

/** Non-hook accessor for use outside React (e.g. module runtime). */
export const widgetRegistry = {
  register: (def: WidgetDefinition) => useWidgetRegistry.getState().register(def),
  registerMany: (defs: WidgetDefinition[]) =>
    useWidgetRegistry.getState().registerMany(defs),
  unregister: (type: string) => useWidgetRegistry.getState().unregister(type),
  getDefinition: (type: string) => useWidgetRegistry.getState().getDefinition(type),
};
