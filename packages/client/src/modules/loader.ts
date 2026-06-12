import type { FrontendModule, InstalledModule } from '@profitmaker/module-sdk';
import { TERMINAL_API_VERSION } from '@profitmaker/module-sdk';

import { resolveServerBase, moduleFetch } from './api';
import { initRuntime } from './runtime';
import { satisfies } from './semver';
import { useModuleLoadStore } from './loaderState';
import { useNotificationStore } from '@/store/notificationStore';

/** A module bundle's default export is a FrontendModule (from defineModule). */
interface ModuleBundle {
  default?: FrontendModule;
}

const injectedStyles = new Set<string>();

/** Inject a module stylesheet once per module id. */
function injectStyle(base: string, id: string, version: string): void {
  if (injectedStyles.has(id)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.module = id;
  link.href = `${base}/modules/${id}/style.css?v=${encodeURIComponent(version)}`;
  document.head.appendChild(link);
  injectedStyles.add(id);
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
  if (!satisfies(TERMINAL_API_VERSION, required)) {
    throw new Error(
      `requires terminal API ${required}, host is ${TERMINAL_API_VERSION}`,
    );
  }

  if (frontend.style) {
    injectStyle(base, id, version);
  }

  const url = `${base}/modules/${id}/bundle.js?v=${encodeURIComponent(version)}`;
  const bundle = (await import(/* @vite-ignore */ url)) as ModuleBundle;
  const def = bundle.default;
  if (!def || typeof def.register !== 'function') {
    throw new Error('bundle has no default export with a register() function');
  }

  await def.register(window.__PROFITMAKER__!);
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

    const toLoad = modules.filter((m) => m.enabled && !m.error && m.manifest.frontend);
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
  })();

  try {
    await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}
