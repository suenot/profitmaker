import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'fs';
import { join, isAbsolute, normalize, sep } from 'path';
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
import { peekRequestIdentity } from './requestIdentity';

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
  /**
   * True between a successful start() and the matching stop(). This is the
   * authoritative "is it running" flag — dispatchMap membership is NOT, because
   * a services-only module (no routes) never enters it and would otherwise be
   * started again on every enable(), duplicating its jobs and providers.
   */
  running: boolean;
  backend?: BackendModule;
  handles?: BackendModuleHandles;
  clearJobs?: () => void;
  clearProviders?: () => void;
}

const MODULES_PKG = { name: 'profitmaker-installed-modules', private: true };

/**
 * Wall-clock ceiling for a `bun add/update/remove` subprocess. Without it an
 * unreachable or slow registry hangs the HTTP request forever.
 */
const PKG_MANAGER_TIMEOUT_MS = 120_000;

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
  /**
   * Tail of the mutation queue. install/upgrade/uninstall/enable/disable all run
   * through `serialize()` so two concurrent calls can never interleave a
   * `bun add` with a `bun remove` in the same cwd (lockfile corruption) or
   * interleave start/stop against `this.loaded`.
   */
  private opChain: Promise<unknown> = Promise.resolve();

  /** Queue `fn` behind every previously queued mutation, whatever their outcome. */
  private serialize<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.opChain.then(fn, fn);
    // Swallow on the chain itself so one failure doesn't reject every later op.
    this.opChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Run a `bun` package-manager subprocess in the modules dir.
   *
   * Both pipes are drained CONCURRENTLY with `exited`. Bun buffers a piped
   * child's output generously, so awaiting `exited` first survives ordinary
   * output, but it does hang once the child writes enough (measured: fine at
   * ~10MB, hangs at ~100MB) — and the previous code never read stdout at all.
   * The timeout below is the real backstop: it bounds the call whatever the
   * cause (unreachable registry, a wedged child, a stuck postinstall).
   */
  private async runPackageManager(args: string[]): Promise<void> {
    const proc = Bun.spawn(['bun', ...args], {
      cwd: this.modulesDir,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        proc.kill();
      } catch {
        /* already gone */
      }
    }, PKG_MANAGER_TIMEOUT_MS);

    try {
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]);
      if (timedOut) {
        throw new Error(`bun ${args.join(' ')} timed out after ${PKG_MANAGER_TIMEOUT_MS}ms`);
      }
      if (exitCode !== 0) {
        const detail = stderr.trim() || stdout.trim();
        throw new Error(`bun ${args.join(' ')} failed (${exitCode}): ${detail}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

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
      this.loaded.set(id, { state, running: false });
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
    this.loaded.set(id, { state, running: false });
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
    // Idempotent: starting an already-running module would register a second
    // set of jobs/providers and orphan the first clearJobs closure.
    if (m.running) return;
    const { manifest, dir, version } = m.state;

    // Backend is optional — a frontend-only module has nothing to start.
    if (!manifest.backend) {
      m.state.error = undefined;
      m.running = true;
      return;
    }

    const entryAbs = this.safeJoin(dir, manifest.backend.entry);
    if (!entryAbs || !existsSync(entryAbs)) {
      throw new Error(`backend entry not found: ${manifest.backend.entry}`);
    }

    const { ctx, clearJobs, clearProviders } = buildBackendModuleContext(id, version, this.io, this.modulesDir);
    try {
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
      m.clearProviders = clearProviders;
      m.state.error = undefined;
      m.running = true;

      if (handles?.routes && typeof handles.routes.handle === 'function') {
        const plugin = handles.routes;
        // Elysia registers plugins/routes asynchronously; a freshly-constructed
        // instance must settle its `modules` promise before handle() will match.
        // The SDK type is structural, so this is best-effort and optional.
        const maybeModules = (plugin as unknown as { modules?: Promise<unknown> }).modules;
        if (maybeModules && typeof (maybeModules as Promise<unknown>).then === 'function') {
          await maybeModules;
        }
        this.dispatchMap.set(id, (req) => plugin.handle(rewriteForModule(id, req)));
      }
    } catch (err) {
      // A module that threw partway through start() may already have registered
      // jobs or providers against the context. Tear those down before
      // propagating, otherwise they outlive a module that never started.
      try {
        clearJobs();
      } catch {
        /* best effort */
      }
      try {
        clearProviders();
      } catch {
        /* best effort */
      }
      m.running = false;
      throw err;
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
      m.clearProviders?.();
    } catch (err) {
      console.error(`[modules] clearProviders failed for ${id}:`, err);
    }
    try {
      await m.backend?.stop?.();
    } catch (err) {
      console.error(`[modules] stop() threw for ${id}:`, err);
    }
    m.backend = undefined;
    m.handles = undefined;
    m.clearJobs = undefined;
    m.clearProviders = undefined;
    m.running = false;
    console.log(`[modules] stopped ${id}`);
  }

  async enable(id: string): Promise<InstalledModule> {
    return this.serialize(async () => {
      const m = this.loaded.get(id);
      if (!m) throw new Error(`unknown module ${id}`);
      // `running` (not dispatchMap membership) decides whether a start is
      // needed: a services-only module never enters dispatchMap.
      if (!m.state.enabled || !m.running) {
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
    });
  }

  async disable(id: string): Promise<InstalledModule> {
    return this.serialize(async () => {
      const m = this.loaded.get(id);
      if (!m) throw new Error(`unknown module ${id}`);
      await this.stop(id);
      m.state.enabled = false;
      this.persistSafe();
      return this.toInstalled(m.state);
    });
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

    return this.serialize(async () => {
      this.ensureModulesDir();
      const spec = opts.version ? `${opts.name}@${opts.version}` : opts.name;
      // `--` marks the end of options so `spec` is always treated as a positional
      // argument, never as a flag (defense-in-depth on top of the validation).
      await this.runPackageManager(['add', '--exact', '--', spec]);

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
      // A manifest id is owned by the package that first claimed it. Without
      // this, any package could declare an incumbent's id and inherit its
      // /api/modules/<id> routes, its /m/<id> socket namespace and its
      // persisted state/<id>.json. Reinstalling the SAME package is still fine.
      const incumbent = this.loaded.get(id);
      if (incumbent && incumbent.state.npmName !== opts.name) {
        throw new Error(
          `module id "${id}" is already provided by package "${incumbent.state.npmName}"; uninstall it first`,
        );
      }

      // Stop the previous instance of this same package before replacing it.
      if (incumbent) await this.stop(id);

      const state: ModuleState = {
        npmName: opts.name,
        version: typeof pkg.version === 'string' ? pkg.version : (opts.version ?? '0.0.0'),
        enabled: true,
        manifest,
        dir: pkgDir,
        dev: false,
      };
      this.loaded.set(id, { state, running: false });
      try {
        await this.start(id);
      } catch (err) {
        state.error = err instanceof Error ? err.message : String(err);
      }
      this.persistSafe();
      return this.toInstalled(state);
    });
  }

  /**
   * Upgrade an installed module to its latest published version. Bun has no
   * reliable ESM cache eviction, so the new code only takes effect after a
   * restart — we mark pendingRestart and leave the running instance alone.
   */
  async upgrade(id: string): Promise<InstalledModule> {
    return this.serialize(async () => {
      const m = this.loaded.get(id);
      if (!m) throw new Error(`unknown module ${id}`);
      if (m.state.dev) throw new Error(`cannot upgrade dev module ${id}`);

      // Re-validate the persisted name: modules.json could have been written by an
      // earlier build (or tampered with) carrying a flag-like npmName.
      assertValidPackageName(m.state.npmName);
      const before = m.state.version;
      // `--latest` is required: install() pins with `--exact`, so package.json
      // holds a single-version range and a plain `bun update` can never move
      // off it — the upgrade would silently no-op while reporting success.
      await this.runPackageManager(['update', '--latest', '--', m.state.npmName]);

      // Reflect the new on-disk version in state; runtime stays on old code.
      const pkg = readJson<Record<string, unknown>>(
        join(this.modulesDir, 'node_modules', m.state.npmName, 'package.json'),
      );
      if (pkg && typeof pkg.version === 'string') m.state.version = pkg.version;
      // Only claim a restart is pending when the code on disk actually changed.
      if (m.state.version !== before) m.state.pendingRestart = true;
      this.persistSafe();
      return this.toInstalled(m.state);
    });
  }

  /**
   * Uninstall a module. Stops it, runs `bun remove`, drops it from state.
   * Because the ESM module graph can't be evicted, code that was already
   * imported stays resident until restart — but the module is gone from the
   * list and its routes/jobs are torn down immediately.
   */
  async uninstall(id: string): Promise<{ id: string; pendingRestart: boolean }> {
    return this.serialize(async () => {
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
      await this.runPackageManager(['remove', '--', m.state.npmName]);
      this.loaded.delete(id);
      this.persistSafe();
      // Already-imported code stays resident in this process until restart.
      return { id, pendingRestart: true };
    });
  }

  // ---- request dispatch ---------------------------------------------------

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

  /**
   * Join base+rel, refusing any path that escapes base (path traversal).
   *
   * The lexical check alone is not enough: a module's published tarball can
   * contain a SYMLINK (e.g. `dist/frontend/assets/x -> /etc/passwd`) whose
   * joined path looks contained but resolves outside. `/modules/:id/assets/*`
   * is served without auth, so that would be an anonymous arbitrary-file read.
   * Both ends are resolved through realpath and re-checked.
   *
   * Returns null when the target does not exist — callers already treat null as
   * a 404.
   */
  private safeJoin(base: string, rel: string): string | null {
    const target = normalize(join(base, rel));
    const baseNorm = normalize(base);
    if (target !== baseNorm && !target.startsWith(baseNorm + sep)) return null;
    try {
      const realBase = realpathSync(baseNorm);
      const realTarget = realpathSync(target);
      if (realTarget !== realBase && !realTarget.startsWith(realBase + sep)) return null;
      return realTarget;
    } catch {
      // ENOENT (or an unreadable path) — nothing safe to serve.
      return null;
    }
  }
}

/**
 * Strip the `/api/modules/<id>` mount prefix so the module's Elysia plugin
 * sees root-relative paths (the SDK contract: "routes relative to root; host
 * mounts under /api/modules/<id>"). `/api/modules/hello/ping` -> `/ping`.
 *
 * Also strips the caller's credentials. Module code is third-party and
 * in-process; forwarding the raw `Authorization` header would hand it the
 * caller's session token / SSO JWT, letting it act as that user against the
 * auth service and every other API — an escalation beyond this process.
 * Modules authenticate via their own context, never by replaying the caller's
 * bearer token.
 *
 * Caller identity is the one thing re-added — as host-minted opaque ids: any
 * client-supplied `x-pm-user-*` headers are dropped, then the identity the
 * auth gate recorded for THIS Request is set (see requestIdentity). A module
 * can trust `x-pm-user-id`/`x-pm-user-auth-id` precisely because the caller
 * can never be their author. No recorded identity (server-to-server calls) →
 * the headers are simply absent.
 *
 * Module-level (not a method) because it touches no manager state — and so it
 * is unit-testable without constructing a manager.
 */
export function rewriteForModule(id: string, request: Request): Request {
  const url = new URL(request.url);
  const prefix = `/api/modules/${id}`;
  if (url.pathname === prefix || url.pathname.startsWith(prefix + '/')) {
    url.pathname = url.pathname.slice(prefix.length) || '/';
  }
  // A standalone Headers has no guard, so `cookie` (a forbidden header name
  // on a Request-guarded Headers) can actually be removed here.
  const sanitized = new Headers(request.headers);
  sanitized.delete('authorization');
  sanitized.delete('proxy-authorization');
  sanitized.delete('cookie');
  // Identity is host-minted: drop caller assertions, then set recorded identity.
  sanitized.delete('x-pm-user-id');
  sanitized.delete('x-pm-user-auth-id');
  // Roles are NOT part of the module protocol. Pre-empt the namespace so a
  // caller-forged role header can never pose as a host assertion — and so no
  // future edit here ever "helpfully" forwards the identity's role map to
  // untrusted module code.
  sanitized.delete('x-pm-user-role');
  const identity = peekRequestIdentity(request);
  if (identity) {
    sanitized.set('x-pm-user-id', identity.userId);
    if (identity.authUserId) sanitized.set('x-pm-user-auth-id', identity.authUserId);
  }
  // Two-step: the inner Request carries over method/body/url, the outer one
  // replaces the header set without having to re-plumb the body stream.
  return new Request(new Request(url, request), { headers: sanitized });
}

/** Process-wide singleton. */
export const moduleManager = new ModuleManager();
export type { InstalledModule };
