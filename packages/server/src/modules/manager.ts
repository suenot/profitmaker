import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, isAbsolute, normalize } from 'path';
import { pathToFileURL } from 'url';
import type { Server as SocketIOServer } from 'socket.io';

import {
  ModuleManifestSchema,
  TERMINAL_API_VERSION,
  type ModuleManifest,
  type InstalledModule,
  type BackendModule,
  type BackendModuleHandles,
} from '@profitmaker/module-sdk';

import { buildBackendModuleContext } from './context';

/**
 * On-disk state for a single installed module. Persisted in
 * `<modulesDir>/modules.json`, keyed by manifest id. `dev` modules are loaded
 * from local paths (PROFITMAKER_DEV_MODULES) and are not recorded in the
 * installed package.json — they are recomputed on every boot.
 */
interface ModuleState {
  /** npm package name (for dev modules, the package.json name or the dir). */
  npmName: string;
  version: string;
  enabled: boolean;
  manifest: ModuleManifest;
  /** Absolute path to the installed package root. */
  dir: string;
  dev?: boolean;
  pendingRestart?: boolean;
  error?: string;
}

/** Live, in-memory handle to a started module (not persisted). */
interface LoadedModule {
  state: ModuleState;
  backend?: BackendModule;
  handles?: BackendModuleHandles;
  clearJobs?: () => void;
}

const MODULES_PKG = { name: 'profitmaker-installed-modules', private: true };

function readJson<T>(file: string): T | null {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return null;
  }
}

/**
 * npm package-name grammar (optionally scoped), deliberately a touch stricter
 * than npm's legacy grammar: the FIRST character of each name part must be
 * `[a-z0-9]` — no leading `-`, `.`, `_`, `~`, no whitespace, no slashes, no
 * uppercase. That leading-char constraint is the load-bearing part: it stops a
 * crafted name like `--registry=evil` or `-x` from being smuggled in as a flag
 * to the `bun add/update/remove` subprocess. install() is an
 * authenticated-but-remote endpoint, so this is the primary guard against
 * argument injection (with the `--` end-of-options marker as defense-in-depth).
 *
 * NB: write the hyphen LAST inside the body class (`[a-z0-9._~-]`) so it stays a
 * literal — `[a-z0-9-~]` would treat `9-~` as a range covering most of ASCII.
 */
const NPM_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/;
/** Conservative semver-ish range: no leading `-`, no whitespace, no shell-ish chars. */
const VERSION_RE = /^[a-zA-Z0-9][a-zA-Z0-9.\-+~^>=<* ]*$/;

function assertValidPackageName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !NPM_NAME_RE.test(name)) {
    throw new Error(`invalid package name: ${JSON.stringify(name)}`);
  }
}

function assertValidVersion(version: string): void {
  // A version cannot start with `-` (would look like a flag) and must match a
  // conservative grammar. Empty is handled by the caller (version is optional).
  if (version.startsWith('-') || !VERSION_RE.test(version)) {
    throw new Error(`invalid version: ${JSON.stringify(version)}`);
  }
}

class ModuleManager {
  private io: SocketIOServer | null = null;
  private modulesDir = '';
  private loaded = new Map<string, LoadedModule>();
  /** id -> dispatch handler (an Elysia-like plugin's handle()). */
  private dispatchMap = new Map<string, (req: Request) => Response | Promise<Response>>();
  private initialized = false;

  /** Resolve MODULES_DIR (env override or <packages/server>/.modules). */
  private resolveModulesDir(): string {
    if (process.env.MODULES_DIR) return process.env.MODULES_DIR;
    // import.meta.dir here is .../packages/server/src/modules
    return join(import.meta.dir, '../../.modules');
  }

  private get modulesJsonPath(): string {
    return join(this.modulesDir, 'modules.json');
  }

  /** Persisted state for installed (non-dev) modules, keyed by id. */
  private readModulesJson(): Record<string, Omit<ModuleState, 'dir'> & { dir?: string }> {
    return readJson(this.modulesJsonPath) ?? {};
  }

  private writeModulesJson(): void {
    const out: Record<string, unknown> = {};
    for (const [id, m] of this.loaded) {
      if (m.state.dev) continue; // dev modules are not persisted
      const { dir: _dir, ...rest } = m.state;
      out[id] = rest;
    }
    writeFileSync(this.modulesJsonPath, JSON.stringify(out, null, 2));
  }

  /** Ensure MODULES_DIR exists and has its own package.json so `bun add` works. */
  private ensureModulesDir(): void {
    if (!existsSync(this.modulesDir)) mkdirSync(this.modulesDir, { recursive: true });
    const pkgPath = join(this.modulesDir, 'package.json');
    if (!existsSync(pkgPath)) {
      writeFileSync(pkgPath, JSON.stringify(MODULES_PKG, null, 2));
    }
    const stateDir = join(this.modulesDir, 'state');
    if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });
  }

  /**
   * Boot the manager: load persisted installed modules and any dev modules,
   * then start the ones that are enabled. A broken module records its error
   * and is skipped; it must never abort server boot.
   */
  async init(io: SocketIOServer): Promise<void> {
    if (this.initialized) return;
    this.io = io;
    this.modulesDir = this.resolveModulesDir();
    this.ensureModulesDir();

    // 1. Persisted installed modules.
    const persisted = this.readModulesJson();
    for (const [id, raw] of Object.entries(persisted)) {
      const dir = join(this.modulesDir, 'node_modules', raw.npmName);
      const state: ModuleState = { ...raw, dir, dev: false };
      this.loaded.set(id, { state });
    }

    // 2. Dev modules from PROFITMAKER_DEV_MODULES (colon-separated paths).
    const devPaths = (process.env.PROFITMAKER_DEV_MODULES || '')
      .split(':')
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of devPaths) {
      try {
        await this.registerDevModule(p);
      } catch (err) {
        console.error(`[modules] failed to register dev module at ${p}:`, err);
      }
    }

    // 3. Start everything that is enabled and not errored.
    for (const [id, m] of this.loaded) {
      if (m.state.enabled && !m.state.error) {
        await this.start(id).catch((err) => {
          m.state.error = err instanceof Error ? err.message : String(err);
          console.error(`[modules] start failed for ${id}:`, err);
        });
      }
    }

    this.persistSafe();
    this.initialized = true;
    console.log(
      `[modules] initialized: ${this.loaded.size} module(s), ${this.dispatchMap.size} active`,
    );
  }

  private persistSafe(): void {
    try {
      this.writeModulesJson();
    } catch (err) {
      console.error('[modules] failed to write modules.json:', err);
    }
  }

  /** Load a local directory as an installed (dev) module. */
  private async registerDevModule(dir: string): Promise<void> {
    const abs = isAbsolute(dir) ? normalize(dir) : normalize(join(process.cwd(), dir));
    const pkg = readJson<Record<string, unknown>>(join(abs, 'package.json'));
    if (!pkg) throw new Error(`no package.json at ${abs}`);
    const manifest = ModuleManifestSchema.parse(pkg.profitmaker);
    const id = manifest.id;
    const state: ModuleState = {
      npmName: typeof pkg.name === 'string' ? pkg.name : id,
      version: typeof pkg.version === 'string' ? pkg.version : '0.0.0',
      enabled: true,
      manifest,
      dir: abs,
      dev: true,
    };
    this.loaded.set(id, { state });
    console.log(`[modules] registered dev module ${id} from ${abs}`);
  }

  // ---- public read API ----------------------------------------------------

  list(): InstalledModule[] {
    return [...this.loaded.values()].map((m) => this.toInstalled(m.state));
  }

  private toInstalled(s: ModuleState): InstalledModule {
    return {
      id: s.manifest.id,
      npmName: s.npmName,
      version: s.version,
      enabled: s.enabled,
      dev: s.dev,
      pendingRestart: s.pendingRestart,
      error: s.error,
      manifest: s.manifest,
    };
  }

  get apiVersion(): string {
    return TERMINAL_API_VERSION;
  }

  // ---- lifecycle ----------------------------------------------------------

  /**
   * Import the backend entry and call start(). Builds the context, registers
   * the dispatch handler, and stores live handles. Errors are recorded on the
   * module state and re-thrown so the caller can decide how to surface them.
   */
  private async start(id: string): Promise<void> {
    const m = this.loaded.get(id);
    if (!m) throw new Error(`unknown module ${id}`);
    if (!this.io) throw new Error('manager not initialized');
    const { manifest, dir, version } = m.state;

    // Backend is optional — a frontend-only module has nothing to start.
    if (!manifest.backend) {
      m.state.error = undefined;
      return;
    }

    const entryAbs = join(dir, manifest.backend.entry);
    if (!existsSync(entryAbs)) {
      throw new Error(`backend entry not found: ${entryAbs}`);
    }

    const { ctx, clearJobs } = buildBackendModuleContext(id, version, this.io, this.modulesDir);
    const mod = (await import(pathToFileURL(entryAbs).href)) as {
      default?: BackendModule;
    } & Partial<BackendModule>;
    const backend: BackendModule | undefined =
      mod.default && typeof mod.default.start === 'function'
        ? mod.default
        : typeof mod.start === 'function'
          ? (mod as unknown as BackendModule)
          : undefined;
    if (!backend) {
      throw new Error(`backend entry ${manifest.backend.entry} has no start() export`);
    }

    const handles = (await backend.start(ctx)) || undefined;
    m.backend = backend;
    m.handles = handles ?? undefined;
    m.clearJobs = clearJobs;
    m.state.error = undefined;

    if (handles?.routes && typeof handles.routes.handle === 'function') {
      const plugin = handles.routes;
      // Elysia registers plugins/routes asynchronously; a freshly-constructed
      // instance must settle its `modules` promise before handle() will match.
      // The SDK type is structural, so this is best-effort and optional.
      const maybeModules = (plugin as unknown as { modules?: Promise<unknown> }).modules;
      if (maybeModules && typeof (maybeModules as Promise<unknown>).then === 'function') {
        await maybeModules;
      }
      this.dispatchMap.set(id, (req) => plugin.handle(this.rewriteForModule(id, req)));
    }
    console.log(`[modules] started ${id}`);
  }

  /** Stop a running module: clear jobs, call stop(), drop the dispatch entry. */
  private async stop(id: string): Promise<void> {
    const m = this.loaded.get(id);
    if (!m) return;
    this.dispatchMap.delete(id);
    try {
      m.clearJobs?.();
    } catch (err) {
      console.error(`[modules] clearJobs failed for ${id}:`, err);
    }
    try {
      await m.backend?.stop?.();
    } catch (err) {
      console.error(`[modules] stop() threw for ${id}:`, err);
    }
    m.backend = undefined;
    m.handles = undefined;
    m.clearJobs = undefined;
    console.log(`[modules] stopped ${id}`);
  }

  async enable(id: string): Promise<InstalledModule> {
    const m = this.loaded.get(id);
    if (!m) throw new Error(`unknown module ${id}`);
    if (!m.state.enabled || !this.dispatchMap.has(id)) {
      m.state.enabled = true;
      try {
        await this.start(id);
        m.state.error = undefined;
      } catch (err) {
        m.state.error = err instanceof Error ? err.message : String(err);
      }
    }
    this.persistSafe();
    return this.toInstalled(m.state);
  }

  async disable(id: string): Promise<InstalledModule> {
    const m = this.loaded.get(id);
    if (!m) throw new Error(`unknown module ${id}`);
    await this.stop(id);
    m.state.enabled = false;
    this.persistSafe();
    return this.toInstalled(m.state);
  }

  /**
   * Install (or reinstall) an npm-published module. Runs `bun add --exact`,
   * reads the installed package.json, validates the manifest and API version,
   * records state and starts the module. Throws on validation failure (after
   * which the partially-added package is left for the user to clean up).
   */
  async install(opts: { name: string; version?: string }): Promise<InstalledModule> {
    // Validate BEFORE touching the filesystem or spawning anything: a name like
    // `--registry=evil` must be rejected without ever reaching `bun add`.
    assertValidPackageName(opts.name);
    if (opts.version !== undefined) assertValidVersion(opts.version);

    this.ensureModulesDir();
    const spec = opts.version ? `${opts.name}@${opts.version}` : opts.name;
    // `--` marks the end of options so `spec` is always treated as a positional
    // argument, never as a flag (defense-in-depth on top of the validation).
    const proc = Bun.spawn(['bun', 'add', '--exact', '--', spec], {
      cwd: this.modulesDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`bun add ${spec} failed (${exitCode}): ${stderr.trim()}`);
    }

    const pkgDir = join(this.modulesDir, 'node_modules', opts.name);
    const pkg = readJson<Record<string, unknown>>(join(pkgDir, 'package.json'));
    if (!pkg) throw new Error(`installed package.json not found for ${opts.name}`);
    const manifest = ModuleManifestSchema.parse(pkg.profitmaker);

    if (!Bun.semver.satisfies(TERMINAL_API_VERSION, manifest.minTerminalApi)) {
      throw new Error(
        `module ${manifest.id} requires terminal API ${manifest.minTerminalApi}, host is ${TERMINAL_API_VERSION}`,
      );
    }

    const id = manifest.id;
    // Stop a previous instance with the same id before replacing it.
    if (this.loaded.has(id)) await this.stop(id);

    const state: ModuleState = {
      npmName: opts.name,
      version: typeof pkg.version === 'string' ? pkg.version : (opts.version ?? '0.0.0'),
      enabled: true,
      manifest,
      dir: pkgDir,
      dev: false,
    };
    this.loaded.set(id, { state });
    try {
      await this.start(id);
    } catch (err) {
      state.error = err instanceof Error ? err.message : String(err);
    }
    this.persistSafe();
    return this.toInstalled(state);
  }

  /**
   * Upgrade an installed module to its latest published version. Bun has no
   * reliable ESM cache eviction, so the new code only takes effect after a
   * restart — we mark pendingRestart and leave the running instance alone.
   */
  async upgrade(id: string): Promise<InstalledModule> {
    const m = this.loaded.get(id);
    if (!m) throw new Error(`unknown module ${id}`);
    if (m.state.dev) throw new Error(`cannot upgrade dev module ${id}`);

    // Re-validate the persisted name: modules.json could have been written by an
    // earlier build (or tampered with) carrying a flag-like npmName.
    assertValidPackageName(m.state.npmName);
    const proc = Bun.spawn(['bun', 'update', '--', m.state.npmName], {
      cwd: this.modulesDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`bun update ${m.state.npmName} failed (${exitCode}): ${stderr.trim()}`);
    }
    // Reflect the new on-disk version in state; runtime stays on old code.
    const pkg = readJson<Record<string, unknown>>(
      join(this.modulesDir, 'node_modules', m.state.npmName, 'package.json'),
    );
    if (pkg && typeof pkg.version === 'string') m.state.version = pkg.version;
    m.state.pendingRestart = true;
    this.persistSafe();
    return this.toInstalled(m.state);
  }

  /**
   * Uninstall a module. Stops it, runs `bun remove`, drops it from state.
   * Because the ESM module graph can't be evicted, code that was already
   * imported stays resident until restart — but the module is gone from the
   * list and its routes/jobs are torn down immediately.
   */
  async uninstall(id: string): Promise<{ id: string; pendingRestart: boolean }> {
    const m = this.loaded.get(id);
    if (!m) throw new Error(`unknown module ${id}`);
    await this.stop(id);

    if (m.state.dev) {
      // Dev modules aren't npm-installed; just forget them for this run.
      this.loaded.delete(id);
      this.persistSafe();
      return { id, pendingRestart: false };
    }

    // Re-validate the persisted name before spawning (same rationale as upgrade).
    assertValidPackageName(m.state.npmName);
    const proc = Bun.spawn(['bun', 'remove', '--', m.state.npmName], {
      cwd: this.modulesDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      throw new Error(`bun remove ${m.state.npmName} failed (${exitCode}): ${stderr.trim()}`);
    }
    this.loaded.delete(id);
    this.persistSafe();
    // Already-imported code stays resident in this process until restart.
    return { id, pendingRestart: true };
  }

  // ---- request dispatch ---------------------------------------------------

  /**
   * Strip the `/api/modules/<id>` mount prefix so the module's Elysia plugin
   * sees root-relative paths (the SDK contract: "routes relative to root; host
   * mounts under /api/modules/<id>"). `/api/modules/hello/ping` -> `/ping`.
   */
  private rewriteForModule(id: string, request: Request): Request {
    const url = new URL(request.url);
    const prefix = `/api/modules/${id}`;
    if (url.pathname === prefix || url.pathname.startsWith(prefix + '/')) {
      url.pathname = url.pathname.slice(prefix.length) || '/';
    }
    return new Request(url, request);
  }

  /**
   * Route an `/api/modules/:id/*` request to the module's Elysia plugin.
   * Returns 404 when the module is unknown/disabled/has no backend routes.
   */
  async dispatch(id: string, request: Request): Promise<Response> {
    const handler = this.dispatchMap.get(id);
    if (!handler) {
      return Response.json({ error: `module "${id}" not found or has no routes` }, { status: 404 });
    }
    try {
      return await handler(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return Response.json({ error: 'module request failed', details: message }, { status: 500 });
    }
  }

  // ---- bundle / asset serving ---------------------------------------------

  /** Absolute path to a module's frontend bundle, or null if it has none. */
  getBundlePath(id: string): string | null {
    const m = this.loaded.get(id);
    if (!m?.state.manifest.frontend) return null;
    return this.safeJoin(m.state.dir, m.state.manifest.frontend.entry);
  }

  /** Absolute path to a module's stylesheet, or null if it declares none. */
  getStylePath(id: string): string | null {
    const m = this.loaded.get(id);
    const style = m?.state.manifest.frontend?.style;
    if (!m || !style) return null;
    return this.safeJoin(m.state.dir, style);
  }

  /**
   * Resolve an arbitrary asset path relative to the module's bundle directory.
   * Used by `/modules/:id/assets/*`. Returns null on traversal attempts.
   */
  getAssetPath(id: string, rest: string): string | null {
    const m = this.loaded.get(id);
    if (!m?.state.manifest.frontend) return null;
    // Assets resolve relative to the bundle's own directory.
    const bundleDir = join(m.state.dir, m.state.manifest.frontend.entry, '..');
    return this.safeJoin(bundleDir, rest);
  }

  /** Join base+rel, refusing any path that escapes base (path traversal). */
  private safeJoin(base: string, rel: string): string | null {
    const target = normalize(join(base, rel));
    const baseNorm = normalize(base);
    if (target !== baseNorm && !target.startsWith(baseNorm + '/')) return null;
    return target;
  }
}

/** Process-wide singleton. */
export const moduleManager = new ModuleManager();
export type { InstalledModule };
