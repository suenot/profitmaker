import { create } from 'zustand';

/**
 * Client-side record of module frontend load failures (bundle import, register
 * call, or API-version mismatch). Separate from the server's `error` field on
 * InstalledModule (which records backend start failures) — the Module Store UI
 * surfaces both.
 */
interface ModuleLoadState {
  /** moduleId -> error message for the most recent failed frontend load. */
  errors: Record<string, string>;
  /** moduleIds whose frontend bundle has been successfully loaded this session. */
  loaded: string[];
  setError: (id: string, message: string) => void;
  clearError: (id: string) => void;
  markLoaded: (id: string) => void;
}

export const useModuleLoadStore = create<ModuleLoadState>((set) => ({
  errors: {},
  loaded: [],
  setError: (id, message) =>
    set((s) => ({ errors: { ...s.errors, [id]: message } })),
  clearError: (id) =>
    set((s) => {
      if (!s.errors[id]) return s;
      const next = { ...s.errors };
      delete next[id];
      return { errors: next };
    }),
  markLoaded: (id) =>
    set((s) => (s.loaded.includes(id) ? s : { loaded: [...s.loaded, id] })),
}));
