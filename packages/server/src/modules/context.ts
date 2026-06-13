import { existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import type { Server as SocketIOServer } from 'socket.io';
import type {
  BackendModuleContext,
  Disposable,
  ModuleJobs,
  ModuleStorage,
} from '@profitmaker/module-sdk';

import { getCCXTInstance } from '../services/ccxtCache';
import { providerRegistry } from '../providers';

/**
 * Directory holding installed-module state files (`<id>.json`). One file per
 * module, lives under MODULES_DIR/state. Created lazily.
 */
function stateDir(modulesDir: string): string {
  const dir = join(modulesDir, 'state');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Per-module JSON storage. The whole key/value map is persisted to a single
 * file `<modulesDir>/state/<id>.json`. Writes are atomic (temp file + rename)
 * and debounced so a chatty module doesn't thrash the disk.
 */
class FileStorage implements ModuleStorage {
  private readonly file: string;
  private cache: Record<string, unknown> | null = null;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private pending: Promise<void> = Promise.resolve();

  constructor(modulesDir: string, id: string) {
    this.file = join(stateDir(modulesDir), `${id}.json`);
  }

  private load(): Record<string, unknown> {
    if (this.cache) return this.cache;
    if (existsSync(this.file)) {
      try {
        this.cache = JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, unknown>;
      } catch {
        this.cache = {};
      }
    } else {
      this.cache = {};
    }
    return this.cache;
  }

  private scheduleWrite(): Promise<void> {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.pending = new Promise<void>((resolve) => {
      this.writeTimer = setTimeout(() => {
        this.writeTimer = null;
        void this.flush().finally(resolve);
      }, 150);
    });
    return this.pending;
  }

  private async flush(): Promise<void> {
    const data = this.cache ?? {};
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    const dir = dirname(this.file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    await Bun.write(tmp, JSON.stringify(data, null, 2));
    // Atomic replace; rename is atomic within the same filesystem.
    await Bun.$`mv -f ${tmp} ${this.file}`.quiet();
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const data = this.load();
    return (key in data ? (data[key] as T) : null);
  }

  async set(key: string, value: unknown): Promise<void> {
    const data = this.load();
    data[key] = value;
    await this.scheduleWrite();
  }

  async delete(key: string): Promise<void> {
    const data = this.load();
    delete data[key];
    await this.scheduleWrite();
  }

  async all(): Promise<Record<string, unknown>> {
    return { ...this.load() };
  }
}

/**
 * Tracks every interval/timeout a module starts so they can be force-cleared
 * when the module stops or is disabled. A module that forgets to dispose a job
 * must not keep running after stop().
 */
class JobRegistry implements ModuleJobs {
  private readonly intervals = new Set<ReturnType<typeof setInterval>>();
  private readonly timeouts = new Set<ReturnType<typeof setTimeout>>();

  every(ms: number, fn: () => void | Promise<void>, _name?: string): Disposable {
    const handle = setInterval(() => {
      void Promise.resolve(fn()).catch(() => {
        /* module job error is the module's problem; swallow to keep loop alive */
      });
    }, ms);
    this.intervals.add(handle);
    return {
      dispose: () => {
        clearInterval(handle);
        this.intervals.delete(handle);
      },
    };
  }

  once(ms: number, fn: () => void | Promise<void>): Disposable {
    const handle = setTimeout(() => {
      this.timeouts.delete(handle);
      void Promise.resolve(fn()).catch(() => {
        /* swallow */
      });
    }, ms);
    this.timeouts.add(handle);
    return {
      dispose: () => {
        clearTimeout(handle);
        this.timeouts.delete(handle);
      },
    };
  }

  /** Force-clear every outstanding job. Called from stop()/disable. */
  clearAll(): void {
    for (const h of this.intervals) clearInterval(h);
    for (const h of this.timeouts) clearTimeout(h);
    this.intervals.clear();
    this.timeouts.clear();
  }
}

export interface BuiltContext {
  ctx: BackendModuleContext;
  /** Force-clear all jobs this module registered (called on stop/disable). */
  clearJobs(): void;
  /** Unregister every provider this module registered (called on stop/disable). */
  clearProviders(): void;
}

/**
 * Build the BackendModuleContext handed to a module's `start(ctx)`. The
 * returned `clearJobs` is owned by the manager and invoked when the module is
 * stopped so background work cannot outlive the module.
 */
export function buildBackendModuleContext(
  id: string,
  version: string,
  io: SocketIOServer,
  modulesDir: string,
): BuiltContext {
  const prefix = `[module:${id}]`;
  const log = {
    info: (...args: unknown[]) => console.log(prefix, ...args),
    warn: (...args: unknown[]) => console.warn(prefix, ...args),
    error: (...args: unknown[]) => console.error(prefix, ...args),
  };

  const jobs = new JobRegistry();
  const storage = new FileStorage(modulesDir, id);
  const dataDir = stateDir(modulesDir);

  // Track providers this module registers so they're all torn down on stop.
  const registeredProviderIds = new Set<string>();

  const ctx: BackendModuleContext = {
    id,
    version,
    log,
    routesPrefix: `/api/modules/${id}`,
    io: io.of(`/m/${id}`),
    ccxt: {
      getInstance: (config) =>
        getCCXTInstance({
          exchangeId: config.exchangeId,
          marketType: config.marketType,
          sandbox: config.sandbox,
          apiKey: config.apiKey,
          secret: config.secret,
          password: config.password,
        }),
    },
    providers: {
      register: (factory) => {
        providerRegistry.register(factory, id);
        registeredProviderIds.add(factory.id);
        log.info(`registered server provider '${factory.id}'`);
        return {
          dispose: () => {
            providerRegistry.unregister(factory.id);
            registeredProviderIds.delete(factory.id);
          },
        };
      },
      unregister: (providerId) => {
        registeredProviderIds.delete(providerId);
        return providerRegistry.unregister(providerId);
      },
    },
    storage,
    jobs,
    env: { dataDir },
  };

  const clearProviders = () => {
    const removed = providerRegistry.unregisterModule(id);
    registeredProviderIds.clear();
    if (removed.length > 0) log.info(`unregistered ${removed.length} provider(s): ${removed.join(', ')}`);
  };

  return { ctx, clearJobs: () => jobs.clearAll(), clearProviders };
}
