import satisfies from 'semver/functions/satisfies';
import type { FrontendModule, InstalledModule } from '@profitmaker/module-sdk';
import { TERMINAL_API_VERSION } from '@profitmaker/module-sdk';

import { resolveServerBase, moduleFetch } from './api';
import { initRuntime, createModuleTerminal } from './runtime';
import { useModuleLoadStore } from './loaderState';
import { useUserModulesStore, applyModuleVisibility } from './userModules';
import { useWidgetRegistry } from './registry';
import { useNotificationStore } from '@/store/notificationStore';

/** A module bundle's default export is a FrontendModule (from defineModule). */
interface ModuleBundle {
  default?: FrontendModule;
}

/** Stylesheet keys (`<id>@<version>`) already injected into <head>. */
const injectedStyles = new Set<string>();

/**
 * Cache of imported module bundles keyed by `<id>@<version>`. An already-imported
 * ES module cannot be re-imported and re-evaluated, so we keep the FrontendModule
 * to re-run register() on re-enable within the same session.
 */
const importedBundles = new Map<string, FrontendModule>();

/**
 * Currently-registered modules by id — the FrontendModule whose `dispose()` must
 * run when the module is disabled or uninstalled.
 */
const activeModules = new Map<string, FrontendModule>();

/**
 * Does `version` satisfy the module's `minTerminalApi` range? An unparseable
 * range fails closed (the module is not loaded) rather than being ignored.
 */
function satisfiesRange(version: string, range: string): boolean {
  try {
    return satisfies(version, range, { includePrerelease: true });
  } catch {
    return false;
  }
}

/**
 * Inject a module stylesheet once per `<id>@<version>`, dropping any stylesheet
 * this module injected for an earlier version so an upgrade does not leave the
 * old CSS applied.
 */
function injectStyle(base: string, id: string, version: string): void {
  const key = `${id}@${version}`;
  if (injectedStyles.has(key)) return;
  removeStyle(id);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.module = id;
  link.href = `${base}/modules/${id}/style.css?v=${encodeURIComponent(version)}`;
  document.head.appendChild(link);
  injectedStyles.add(key);
}

/** Remove a module's injected stylesheet(s) from <head>. */
function removeStyle(id: string): void {
  if (typeof document !== 'undefined') {
    for (const link of document.querySelectorAll(`link[data-module="${CSS.escape(id)}"]`)) {
      link.remove();
    }
  }
  for (const key of injectedStyles) {
    if (key.startsWith(`${id}@`)) injectedStyles.delete(key);
  }
}

/**
 * Load and register a single module's frontend bundle. Throws on failure so the
 * caller can record the error per-module; never lets one module affect another.
 */
async function loadModule(base: string, module: InstalledModule): Promise<void> {
  const { id, version, manifest } = module;
  const frontend = manifest.frontend;
  if (!frontend) return; // backend-only module, nothing to load on the client

  const required = manifest.minTerminalApi || '>=1.0.0';
  if (!satisfiesRange(TERMINAL_API_VERSION, required)) {
    throw new Error(
      `requires terminal API ${required}, host is ${TERMINAL_API_VERSION}`,
    );
  }

  if (frontend.style) {
    injectStyle(base, id, version);
  }

  const cacheKey = `${id}@${version}`;
  let def = importedBundles.get(cacheKey);
  if (!def) {
    const url = `${base}/modules/${id}/bundle.js?v=${encodeURIComponent(version)}`;
    const bundle = (await import(/* @vite-ignore */ url)) as ModuleBundle;
    def = bundle.default;
    if (!def || typeof def.register !== 'function') {
      throw new Error('bundle has no default export with a register() function');
    }
    importedBundles.set(cacheKey, def);
  }

  // Re-registering is safe: the registry replaces (with a warn) on duplicate
  // type, so re-enabling a module re-registers its widgets from the cached def.
  // The terminal handed over is scoped to this module id, so every widget it
  // registers is attributed to it — that attribution is what unloadModule()
  // unregisters by, and what stops it claiming a built-in or another module's
  // widget type.
  await def.register(createModuleTerminal(id));
  activeModules.set(id, def);
}

let loadingPromise: Promise<void> | null = null;

/**
 * Fetch the installed-module list and load every enabled module's frontend
 * bundle. Each module is loaded in its own try/catch: a broken module records
 * an error (surfaced in the Module Store) and notifies, but does not break the
 * other modules or the terminal. Safe to call repeatedly (e.g. after installing
 * a new module) — concurrent calls share one in-flight run.
 */
export async function loadModules(): Promise<void> {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    // Guarantee the host API exists before importing any bundle.
    initRuntime();

    const base = resolveServerBase();
    const loadState = useModuleLoadStore.getState();
    const notify = useNotificationStore.getState();

    let modules: InstalledModule[];
    try {
      const res = await moduleFetch('/api/modules');
      if (!res.ok) throw new Error(`GET /api/modules -> ${res.status}`);
      // When the base resolves to the SPA's own origin without a real API
      // (e.g. static deploy, no ccxt-server provider configured yet), this
      // request returns the index.html. Treat a non-JSON response as "no
      // server" rather than a hard error — the terminal works standalone.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.info('[module-loader] no module server reachable; skipping module load.');
        return;
      }
      const data = (await res.json()) as { modules?: InstalledModule[] };
      modules = data.modules ?? [];
    } catch (err) {
      // No server / not reachable is a normal state (terminal works standalone).
      console.warn('[module-loader] could not fetch installed modules:', err);
      return;
    }

    // Hidden modules are a per-user preference (userModules.ts): never import
    // their bundles for this user, even on a cold start.
    const { isHidden } = useUserModulesStore.getState();
    const toLoad = modules.filter(
      (m) => m.enabled && !m.error && m.manifest.frontend && !isHidden(m.id),
    );
    await Promise.all(
      toLoad.map(async (m) => {
        try {
          await loadModule(base, m);
          loadState.clearError(m.id);
          loadState.markLoaded(m.id);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[module-loader] failed to load module "${m.id}":`, err);
          loadState.setError(m.id, message);
          notify.showError(`Module "${m.id}" failed to load`, message);
        }
      }),
    );

    // Re-apply visibility AFTER the loads settle. The filter above is not
    // enough on its own: the hidden list hydrates asynchronously, so a hide
    // can land while (or after) these bundles register, and any later
    // loadModules() call re-registers cached bundles wholesale. Unregistering
    // here closes both; without the filter, hidden widgets would flash in the
    // picker between registration and this sweep.
    applyModuleVisibility();
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/**
 * Tear a module's frontend down (on disable or uninstall): run its `dispose()`
 * so its timers/sockets/listeners stop, unregister every widget type it
 * actually registered, and drop its stylesheet. Open dashboard widgets of those
 * types fall back to the UnknownWidgetPlaceholder.
 *
 * Widget types come from the registry's ownership map, NOT from the manifest —
 * the manifest's widget list is display metadata (runtime registration is
 * authoritative), so a type the module registered without declaring would
 * otherwise survive being disabled.
 *
 * NOTE: the already-imported ES bundle cannot be evicted (Bun/JS limitation),
 * so re-enabling within the same session re-registers via the cached
 * FrontendModule; a hard removal of the module code needs a reload.
 */
export function unloadModule(module: InstalledModule): void {
  const { id } = module;

  const def = activeModules.get(id);
  if (def?.dispose) {
    try {
      def.dispose();
    } catch (err) {
      console.error(`[module-loader] dispose() threw for module "${id}":`, err);
    }
  }
  activeModules.delete(id);

  useWidgetRegistry.getState().unregisterByOwner(id);
  removeStyle(id);
  useModuleLoadStore.getState().clearError(id);
}
