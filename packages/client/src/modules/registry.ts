import { create } from 'zustand';
import type { WidgetDefinition } from '@profitmaker/module-sdk';

/**
 * Dynamic widget registry.
 *
 * Holds every renderable widget definition keyed by `type`. Built-in widgets
 * register here at startup (see `builtinWidgets.tsx`); module widgets register
 * at load time via the host Terminal API.
 *
 * OWNERSHIP: every type is owned by whoever registered it first — {@link HOST_OWNER}
 * for built-ins, the module id for module widgets. A type owned by someone else
 * can neither be replaced nor unregistered, so a module cannot hijack the
 * built-in `orderForm` / `chart` types (which would let it impersonate the
 * order-entry UI) nor delete a widget out from under another module. Module
 * registrations must additionally be namespaced `<moduleId>.<widgetName>`,
 * matching the regex the manifest schema already enforces at install time.
 *
 * NOTE: this store is intentionally a plain `create()` with NO persist
 * middleware — definitions carry live React components and cannot be
 * serialised. Persistence of *which* widgets exist on a dashboard lives in the
 * dashboard store; the registry only maps a `type` string to its definition.
 */

/** Owner id for host-registered (built-in) widgets. Never a valid module id. */
export const HOST_OWNER = 'host';

interface WidgetRegistryState {
  definitions: Record<string, WidgetDefinition>;
  /** type -> owner id: HOST_OWNER for built-ins, the module id for module widgets. */
  owners: Record<string, string>;
  /** Register one definition. Returns false (and logs) if `owner` may not claim the type. */
  register: (def: WidgetDefinition, owner?: string) => boolean;
  registerMany: (defs: WidgetDefinition[], owner?: string) => void;
  /** Unregister a type. Only its owner may do so. */
  unregister: (type: string, owner?: string) => boolean;
  /** Unregister every type owned by `owner`; returns the removed types. */
  unregisterByOwner: (owner: string) => string[];
  /** Types currently owned by `owner`. */
  typesByOwner: (owner: string) => string[];
  getDefinition: (type: string) => WidgetDefinition | undefined;
  /** All definitions in a category, in registration order. */
  listByCategory: (category: string) => WidgetDefinition[];
}

/**
 * Why `owner` may not claim `type`, or null when the claim is allowed.
 * Exported for tests.
 */
export function ownershipError(
  owners: Record<string, string>,
  type: string,
  owner: string,
): string | null {
  const existing = owners[type];
  if (existing && existing !== owner) {
    return `widget type "${type}" is owned by "${existing}" — "${owner}" may not claim it`;
  }
  if (owner !== HOST_OWNER && !type.startsWith(`${owner}.`)) {
    return `module "${owner}" may only register widget types namespaced "${owner}.<widgetName>", got "${type}"`;
  }
  return null;
}

export const useWidgetRegistry = create<WidgetRegistryState>((set, get) => ({
  definitions: {},
  owners: {},

  register: (def, owner = HOST_OWNER) => {
    const error = ownershipError(get().owners, def.type, owner);
    if (error) {
      console.error(`[WidgetRegistry] rejected registration: ${error}`);
      return false;
    }
    set((state) => {
      if (state.definitions[def.type]) {
        console.warn(
          `[WidgetRegistry] Re-registering widget type "${def.type}" — replacing existing definition.`
        );
      }
      return {
        definitions: { ...state.definitions, [def.type]: def },
        owners: { ...state.owners, [def.type]: owner },
      };
    });
    return true;
  },

  registerMany: (defs, owner = HOST_OWNER) => {
    for (const def of defs) {
      get().register(def, owner);
    }
  },

  unregister: (type, owner = HOST_OWNER) => {
    const existing = get().owners[type];
    if (existing && existing !== owner) {
      console.error(
        `[WidgetRegistry] rejected unregister: widget type "${type}" is owned by "${existing}", not "${owner}"`
      );
      return false;
    }
    if (!get().definitions[type]) return false;
    set((state) => {
      const definitions = { ...state.definitions };
      const owners = { ...state.owners };
      delete definitions[type];
      delete owners[type];
      return { definitions, owners };
    });
    return true;
  },

  unregisterByOwner: (owner) => {
    const removed = get().typesByOwner(owner);
    if (!removed.length) return removed;
    set((state) => {
      const definitions = { ...state.definitions };
      const owners = { ...state.owners };
      for (const type of removed) {
        delete definitions[type];
        delete owners[type];
      }
      return { definitions, owners };
    });
    return removed;
  },

  typesByOwner: (owner) => {
    const owners = get().owners;
    return Object.keys(owners).filter((type) => owners[type] === owner);
  },

  getDefinition: (type) => get().definitions[type],

  listByCategory: (category) =>
    Object.values(get().definitions).filter((def) => def.category === category),
}));

/** Non-hook accessor for use outside React (e.g. module runtime). */
export const widgetRegistry = {
  register: (def: WidgetDefinition, owner?: string) =>
    useWidgetRegistry.getState().register(def, owner),
  registerMany: (defs: WidgetDefinition[], owner?: string) =>
    useWidgetRegistry.getState().registerMany(defs, owner),
  unregister: (type: string, owner?: string) =>
    useWidgetRegistry.getState().unregister(type, owner),
  getDefinition: (type: string) => useWidgetRegistry.getState().getDefinition(type),
};
