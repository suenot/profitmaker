import { create } from 'zustand';
import { moduleFetch } from './api';
import { useWidgetRegistry } from './registry';

/**
 * Per-user visibility of installed modules.
 *
 * Hiding a module is a UI preference of ONE user, not a lifecycle action: it
 * only unregisters that module's widget types in this browser, so they leave
 * the add-widget menu and any open instance falls back to the unknown widget
 * placeholder — exactly what a disabled module looks like. The module itself
 * keeps running for everyone: contrast unloadModule() in loader.ts, the
 * operator's disable path, which also runs the module's dispose() to stop its
 * timers/sockets. Nothing here ever calls dispose().
 *
 * WHY NOT the /api/modules routes: those change the installation for every
 * user and are admin-gated. The hidden list is a per-user preference stored in
 * the user's own settings, so it needs only a normal session.
 *
 * IMPORT DISCIPLINE: this file imports only ./api and ./registry — never
 * ./loader, which imports this store (cycle). Un-hiding therefore cannot
 * re-register from here; the Module Store widget orchestrates it by calling
 * loadModules() after setEnabled(id, true), which re-registers from the
 * loader's imported-bundle cache.
 */

/** User-settings key holding the array of hidden module ids. */
const SETTING_KEY = 'modules.disabled';

interface UserModulesState {
  /** Module ids the user has hidden from their own terminal. */
  disabled: string[];
  /** True once the server setting has been read (or found to be absent). */
  hydrated: boolean;
  /** In-flight write, so the UI can disable the switch it just flipped. */
  busyId: string | null;
  hydrate: () => Promise<void>;
  isHidden: (id: string) => boolean;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
}

/**
 * Unregister every widget type owned by a hidden module. Idempotent: owners
 * with nothing registered (never loaded, or already unregistered) are no-ops,
 * so it is safe to call on every hydrate, toggle and module load.
 */
export function applyModuleVisibility(): void {
  const registry = useWidgetRegistry.getState();
  for (const id of useUserModulesStore.getState().disabled) {
    registry.unregisterByOwner(id);
  }
}

export const useUserModulesStore = create<UserModulesState>((set, get) => ({
  disabled: [],
  hydrated: false,
  busyId: null,

  hydrate: async () => {
    try {
      const res = await moduleFetch(`/api/settings/${encodeURIComponent(SETTING_KEY)}`);
      // 404 = never set, 401 = not signed in yet. Both mean "nothing hidden",
      // and neither is worth surfacing as an error.
      if (res.ok) {
        const body = (await res.json()) as { data?: { value?: unknown } };
        const value = body?.data?.value;
        const disabled = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
        set({ disabled });
        applyModuleVisibility();
      }
    } catch (err) {
      console.warn('[userModules] could not read the hidden list:', err);
    } finally {
      set({ hydrated: true });
    }
  },

  isHidden: (id) => get().disabled.includes(id),

  setEnabled: async (id, enabled) => {
    const next = enabled
      ? get().disabled.filter((m) => m !== id)
      : Array.from(new Set([...get().disabled, id]));

    // Apply locally first so the UI reacts immediately, then persist. A failed
    // write rolls the change back rather than leaving the two out of step.
    const previous = get().disabled;
    const registry = useWidgetRegistry.getState();

    // Unlike built-ins there is no static catalog to re-register a hidden
    // module's widgets from, and importing the loader here would be a cycle —
    // so snapshot them before unregistering to be able to roll the registry
    // back if the write fails. (Rolling back an UN-hide needs nothing: the
    // loader re-registers on un-hide, so its failure leaves widgets hidden,
    // which is exactly the state being restored to.)
    const snapshot = enabled
      ? []
      : registry
          .typesByOwner(id)
          .map((type) => ({ type, def: registry.getDefinition(type)! }));

    set({ disabled: next, busyId: id });
    if (!enabled) applyModuleVisibility();
    try {
      const res = await moduleFetch(`/api/settings/${encodeURIComponent(SETTING_KEY)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      });
      if (!res.ok) throw new Error(`PUT settings -> ${res.status}`);
    } catch (err) {
      set({ disabled: previous });
      for (const { type, def } of snapshot) {
        if (!registry.getDefinition(type)) registry.register(def, id);
      }
      throw err;
    } finally {
      set({ busyId: null });
    }
  },
}));
