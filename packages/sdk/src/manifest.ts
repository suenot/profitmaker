import { z } from 'zod';

/**
 * Discovery convention:
 * - npm keyword `profitmaker-module` (authoritative discovery key)
 * - recommended package name: `profitmaker-module-<id>` or `@scope/profitmaker-module-<id>`
 *
 * The `profitmaker` key in the module's package.json is the manifest,
 * validated against this schema by the server before install completes
 * and by the client before loading a bundle.
 */

export const MODULE_KEYWORD = 'profitmaker-module';

export const ModulePermissionSchema = z.enum([
  'market-data', // reads public market data (candles/trades/orderbook/ticker)
  'private-data', // reads private account data (balances/orders/positions)
  'orders', // places or cancels orders
  'network', // makes its own outbound network requests (backend)
  'storage', // persists its own state via ctx.storage
  'jobs', // runs background jobs via ctx.jobs
  'provider', // registers a server-side data/trading provider via ctx.providers
]);
export type ModulePermission = z.infer<typeof ModulePermissionSchema>;

export const ModuleWidgetMetaSchema = z.object({
  /** Namespaced widget type: `<moduleId>.<widgetName>`, e.g. `arbitrage.opportunities` */
  type: z.string().regex(/^[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9]*$/, {
    message: 'widget type must be "<moduleId>.<widgetName>"',
  }),
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().default('modules'),
});
export type ModuleWidgetMeta = z.infer<typeof ModuleWidgetMetaSchema>;

export const ModuleFrontendSchema = z.object({
  /** Path inside the published package to the ESM bundle, e.g. "dist/frontend/index.js" */
  entry: z.string().min(1),
  /** Optional stylesheet served alongside the bundle */
  style: z.string().optional(),
  /** Display metadata for the Module Store UI; runtime registration is authoritative */
  widgets: z.array(ModuleWidgetMetaSchema).default([]),
});

export const ModuleBackendSchema = z.object({
  /** Path inside the published package to the backend ESM entry, e.g. "dist/backend/index.js" */
  entry: z.string().min(1),
  /** Documented route suffixes mounted under /api/modules/<id> (informational) */
  routes: z.array(z.string()).default([]),
  /** Documented long-running services (informational) */
  services: z.array(z.string()).default([]),
});

export const ModuleManifestSchema = z.object({
  manifestVersion: z.literal(1),
  /** Globally-unique module id; used in URLs and widget-type namespacing */
  id: z.string().regex(/^[a-z][a-z0-9-]*$/, {
    message: 'module id must be lowercase kebab-case, starting with a letter',
  }),
  displayName: z.string().min(1),
  description: z.string().default(''),
  /** Semver range checked against the host TERMINAL_API_VERSION */
  minTerminalApi: z.string().default('>=1.0.0'),
  /** Declarative (not enforced) — surfaced in the Module Store so users know what a module touches */
  permissions: z.array(ModulePermissionSchema).default([]),
  frontend: ModuleFrontendSchema.optional(),
  backend: ModuleBackendSchema.optional(),
}).refine((m) => m.frontend || m.backend, {
  message: 'module must declare at least one of "frontend" or "backend"',
});
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;

/** Shape of `GET /api/modules` entries shared between server, client and MCP */
export interface InstalledModule {
  /** Manifest id */
  id: string;
  /** npm package name */
  npmName: string;
  version: string;
  enabled: boolean;
  /** true when the installed package dir is a local dev path (PROFITMAKER_DEV_MODULES) */
  dev?: boolean;
  /** set when an upgrade/uninstall needs a server restart to fully apply */
  pendingRestart?: boolean;
  /** last load/start error, if any (module stays installed but inactive) */
  error?: string;
  manifest: ModuleManifest;
}

/** Parse and validate the `profitmaker` key out of a package.json object. */
export function parseModuleManifest(pkgJson: unknown): ModuleManifest {
  const pkg = z.object({ profitmaker: z.unknown() }).parse(pkgJson);
  return ModuleManifestSchema.parse(pkg.profitmaker);
}
