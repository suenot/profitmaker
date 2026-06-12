import { Elysia, t } from 'elysia';
import { extname } from 'path';
import { existsSync } from 'fs';

import { moduleManager } from '../modules/manager';
import { MODULE_KEYWORD } from '@profitmaker/module-sdk';

const NPM_SEARCH = 'https://registry.npmjs.org/-/v1/search';

/**
 * Module management + dispatch routes, mounted under /api/modules.
 *
 * IMPORTANT: the dispatch catch-all `.all('/:id/*')` is registered LAST so the
 * specific routes (install/enable/disable/upgrade/search/...) win over it.
 *
 * These routes sit under /api/, so they inherit the Bearer auth in index.ts's
 * onBeforeHandle. The bundle/asset routes below are mounted OUTSIDE /api/ and
 * intentionally bypass auth (public static assets), matching existing design.
 */
export const moduleRoutes = new Elysia({ prefix: '/api/modules' })
  // GET /api/modules — installed list + host apiVersion
  .get('/', () => ({
    modules: moduleManager.list(),
    apiVersion: moduleManager.apiVersion,
  }))

  // GET /api/modules/search?q= — proxy the npm registry keyword search
  .get(
    '/search',
    async ({ query, set }) => {
      const q = (query.q || '').trim();
      const text = q ? `${q} keywords:${MODULE_KEYWORD}` : `keywords:${MODULE_KEYWORD}`;
      const url = `${NPM_SEARCH}?text=${encodeURIComponent(text)}&size=50`;
      try {
        const res = await fetch(url);
        if (!res.ok) {
          set.status = 502;
          return { error: 'npm registry search failed', status: res.status };
        }
        const data = (await res.json()) as {
          objects?: Array<{ package?: NpmPackage }>;
        };
        const results = (data.objects ?? [])
          .map((o) => o.package)
          .filter((p): p is NpmPackage => !!p && Array.isArray(p.keywords) && p.keywords.includes(MODULE_KEYWORD))
          .map((p) => ({
            name: p.name,
            version: p.version,
            description: p.description ?? '',
            keywords: p.keywords ?? [],
          }));
        return { results };
      } catch (err) {
        set.status = 502;
        return { error: 'npm registry unreachable', details: err instanceof Error ? err.message : String(err) };
      }
    },
    { query: t.Object({ q: t.Optional(t.String()) }) },
  )

  // POST /api/modules/install { name, version? }
  .post(
    '/install',
    async ({ body, set }) => {
      try {
        const mod = await moduleManager.install({ name: body.name, version: body.version });
        return { module: mod };
      } catch (err) {
        set.status = 400;
        return { error: 'install failed', details: err instanceof Error ? err.message : String(err) };
      }
    },
    { body: t.Object({ name: t.String(), version: t.Optional(t.String()) }) },
  )

  // POST /api/modules/:id/enable
  .post('/:id/enable', async ({ params, set }) => {
    try {
      return { module: await moduleManager.enable(params.id) };
    } catch (err) {
      set.status = 404;
      return { error: 'enable failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // POST /api/modules/:id/disable
  .post('/:id/disable', async ({ params, set }) => {
    try {
      return { module: await moduleManager.disable(params.id) };
    } catch (err) {
      set.status = 404;
      return { error: 'disable failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // POST /api/modules/:id/upgrade
  .post('/:id/upgrade', async ({ params, set }) => {
    try {
      return { module: await moduleManager.upgrade(params.id) };
    } catch (err) {
      set.status = 400;
      return { error: 'upgrade failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // DELETE /api/modules/:id — uninstall
  .delete('/:id', async ({ params, set }) => {
    try {
      return await moduleManager.uninstall(params.id);
    } catch (err) {
      set.status = 404;
      return { error: 'uninstall failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // Dispatch catch-all — MUST be last so specific routes above take priority.
  // Forwards /api/modules/:id/<anything> to the module's own Elysia plugin.
  .all('/:id/*', ({ params, request }) => moduleManager.dispatch(params.id, request));

interface NpmPackage {
  name: string;
  version: string;
  description?: string;
  keywords?: string[];
}

const BUNDLE_HEADERS = { 'Cache-Control': 'no-cache' };
const ASSET_MIME: Record<string, string> = {
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

/**
 * Public bundle/asset serving for module frontends. Mounted OUTSIDE /api/ so it
 * is not behind Bearer auth — the browser <script> loader fetches these
 * unauthenticated, same as built-in static assets. Paths are traversal-checked
 * inside the manager.
 */
export const moduleAssetRoutes = new Elysia({ prefix: '/modules' })
  .get('/:id/bundle.js', ({ params, set }) => {
    const path = moduleManager.getBundlePath(params.id);
    if (!path || !existsSync(path)) {
      set.status = 404;
      return 'module bundle not found';
    }
    set.headers['Content-Type'] = 'application/javascript';
    set.headers['Cache-Control'] = BUNDLE_HEADERS['Cache-Control'];
    return new Response(Bun.file(path), {
      headers: { 'Content-Type': 'application/javascript', ...BUNDLE_HEADERS },
    });
  })

  .get('/:id/style.css', ({ params, set }) => {
    const path = moduleManager.getStylePath(params.id);
    if (!path || !existsSync(path)) {
      set.status = 404;
      return 'module stylesheet not found';
    }
    return new Response(Bun.file(path), {
      headers: { 'Content-Type': 'text/css', ...BUNDLE_HEADERS },
    });
  })

  .get('/:id/assets/*', ({ params, set }) => {
    // Elysia captures only the segment after `/assets/` in the wildcard; the
    // assets live in an `assets/` dir alongside the bundle, so re-add it.
    const rest = `assets/${params['*']}`;
    const path = moduleManager.getAssetPath(params.id, rest);
    if (!path || !existsSync(path)) {
      set.status = 404;
      return 'asset not found';
    }
    const mime = ASSET_MIME[extname(path)] || 'application/octet-stream';
    return new Response(Bun.file(path), {
      headers: { 'Content-Type': mime, ...BUNDLE_HEADERS },
    });
  });
