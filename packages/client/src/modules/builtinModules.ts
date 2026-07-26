import { create } from 'zustand';
import { moduleFetch } from './api';
import { getBuiltinDefinition, listBuiltinModules } from './builtinCatalog';
import { useWidgetRegistry } from './registry';

/**
 * Built-in widgets as switchable modules.
 *
 * Every built-in widget is listed in the Module Store next to installed npm
 * modules and can be switched off. Off means the widget type is unregistered:
 * it leaves the add-widget menu and any open instance falls back to the unknown
 * widget placeholder — the same thing that happens when a module is disabled.
 *
 * WHY NOT the /api/modules routes: those are operator-gated (installing a module
 * runs third-party code with the server's privileges). Toggling a built-in runs
 * nothing and is a per-user preference, so it lives in the user's settings and
 * needs only a normal session.
 *
 * The Module Store itself is locked on — switching it off would remove the only
 * UI capable of switching anything back on.
 */

/** User-settings key holding the array of disabled built-in widget types. */
const SETTING_KEY = 'builtinWidgets.disabled';

interface BuiltinModulesState {
  /** Widget types the user has switched off. */
  disabled: string[];
  /** True once the server setting has been read (or found to be absent). */
  hydrated: boolean;
  /** In-flight write, so the UI can disable the switch it just flipped. */
  busyType: string | null;
  hydrate: () => Promise<void>;
  isEnabled: (type: string) => boolean;
  setEnabled: (type: string, enabled: boolean) => Promise<void>;
}

/** Apply the disabled set to the widget registry (unregister off, restore on). */
function applyToRegistry(disabled: string[]): void {
  const registry = useWidgetRegistry.getState();
  const off = new Set(disabled);

  for (const info of listBuiltinModules()) {
    if (info.locked) continue;
    const shouldBeOn = !off.has(info.type);
    const isOn = !!registry.getDefinition(info.type);
    if (shouldBeOn === isOn) continue;

    if (shouldBeOn) {
      const def = getBuiltinDefinition(info.type);
      if (def) registry.register(def);
    } else {
      registry.unregister(info.type);
    }
  }
}

export const useBuiltinModulesStore = create<BuiltinModulesState>((set, get) => ({
  disabled: [],
  hydrated: false,
  busyType: null,

  hydrate: async () => {
    try {
      const res = await moduleFetch(`/api/settings/${encodeURIComponent(SETTING_KEY)}`);
      // 404 = never set, 401 = not signed in yet. Both mean "nothing disabled",
      // and neither is worth surfacing as an error.
      if (res.ok) {
        const body = (await res.json()) as { data?: { value?: unknown } };
        const value = body?.data?.value;
        const disabled = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
        set({ disabled });
        applyToRegistry(disabled);
      }
    } catch (err) {
      console.warn('[builtinModules] could not read the disabled list:', err);
    } finally {
      set({ hydrated: true });
    }
  },

  isEnabled: (type) => !get().disabled.includes(type),

  setEnabled: async (type, enabled) => {
    const def = getBuiltinDefinition(type);
    if (def?.locked) return;

    const next = enabled
      ? get().disabled.filter((t) => t !== type)
      : Array.from(new Set([...get().disabled, type]));

    // Apply locally first so the UI reacts immediately, then persist. A failed
    // write rolls the change back rather than leaving the two out of step.
    const previous = get().disabled;
    set({ disabled: next, busyType: type });
    applyToRegistry(next);
    try {
      const res = await moduleFetch(`/api/settings/${encodeURIComponent(SETTING_KEY)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: next }),
      });
      if (!res.ok) throw new Error(`PUT settings -> ${res.status}`);
    } catch (err) {
      set({ disabled: previous });
      applyToRegistry(previous);
      throw err;
    } finally {
      set({ busyType: null });
    }
  },
}));
