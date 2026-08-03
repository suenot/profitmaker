import { Elysia, t } from 'elysia';
import { extname } from 'path';
import { existsSync } from 'fs';
import { createHash, timingSafeEqual } from 'node:crypto';

import { moduleManager } from '../modules/manager';
import { MODULE_KEYWORD } from '@profitmaker/module-sdk';

const NPM_SEARCH = 'https://registry.npmjs.org/-/v1/search';

/**
 * Operator-only credential for the module lifecycle routes.
 *
 * Installing a module means downloading an arbitrary npm package and importing
 * it into THIS process, where it runs unsandboxed with the server's full
 * privileges (DB, process.env, filesystem, every user's exchange credentials).
 * That is an operator action, not an end-user one, so it is deliberately NOT
 * satisfied by a user session and NOT by the general-purpose API_TOKEN — those
 * authenticate "some legitimate caller", which is a far larger set than "the
 * person who administers this deployment". On a hosted install any SSO account
 * is in the first set, which made this a remote-code-execution path.
 *
 * Presented as its OWN header (`X-Modules-Admin-Token`) rather than as the
 * bearer token, because /api/* already spends the Authorization header on user
 * auth in index.ts — a caller sends their normal bearer AND this header.
 *
 * FAIL CLOSED: when MODULES_ADMIN_TOKEN is unset, module management is
 * disabled outright rather than falling back to user auth. Read-only routes
 * (list/search) and dispatch are unaffected.
 */
const MODULES_ADMIN_TOKEN = process.env.MODULES_ADMIN_TOKEN || '';
const ADMIN_HEADER = 'x-modules-admin-token';

/**
 * Length-independent constant-time comparison of two secrets.
 *
 * timingSafeEqual throws on a length mismatch, which would itself leak the
 * secret's length, so both sides are hashed to a fixed 32 bytes first and the
 * comparison is always over equal-length buffers. node:crypto (not
 * Bun.CryptoHasher) so this behaves identically under Bun and under the Node
 * runtime the unit tests use — a security guard must not depend on which
 * runtime it happens to be loaded in.
 */
function secretsMatch(a: string, b: string): boolean {
  const ah = createHash('sha256').update(a, 'utf8').digest();
  const bh = createHash('sha256').update(b, 'utf8').digest();
  return timingSafeEqual(ah, bh);
}

/**
 * Guard for the lifecycle routes. Returns an error body to short-circuit with,
 * or null when the caller proved operator rights.
 */
function operatorDenied(request: Request, set: { status?: number | string }): { error: string; details: string } | null {
  if (!MODULES_ADMIN_TOKEN) {
    set.status = 503;
    return {
      error: 'module management disabled',
      details: 'MODULES_ADMIN_TOKEN is not configured on this server',
    };
  }
  const presented = request.headers.get(ADMIN_HEADER) || '';
  if (!presented || !secretsMatch(presented, MODULES_ADMIN_TOKEN)) {
    set.status = 403;
    return {
      error: 'operator credential required',
      details: `module install/upgrade/uninstall requires a valid ${ADMIN_HEADER} header`,
    };
  }
  return null;
}

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

  // POST /api/modules/install { name, version? } — OPERATOR ONLY
  .post(
    '/install',
    async ({ body, set, request }) => {
      const denied = operatorDenied(request, set);
      if (denied) return denied;
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

  // POST /api/modules/:id/enable — OPERATOR ONLY (starts third-party code)
  .post('/:id/enable', async ({ params, set, request }) => {
    const denied = operatorDenied(request, set);
    if (denied) return denied;
    try {
      return { module: await moduleManager.enable(params.id) };
    } catch (err) {
      set.status = 404;
      return { error: 'enable failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // POST /api/modules/:id/disable — OPERATOR ONLY (paired with enable)
  .post('/:id/disable', async ({ params, set, request }) => {
    const denied = operatorDenied(request, set);
    if (denied) return denied;
    try {
      return { module: await moduleManager.disable(params.id) };
    } catch (err) {
      set.status = 404;
      return { error: 'disable failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // POST /api/modules/:id/upgrade — OPERATOR ONLY
  .post('/:id/upgrade', async ({ params, set, request }) => {
    const denied = operatorDenied(request, set);
    if (denied) return denied;
    try {
      return { module: await moduleManager.upgrade(params.id) };
    } catch (err) {
      set.status = 400;
      return { error: 'upgrade failed', details: err instanceof Error ? err.message : String(err) };
    }
  })

  // DELETE /api/modules/:id — uninstall — OPERATOR ONLY
  .delete('/:id', async ({ params, set, request }) => {
    const denied = operatorDenied(request, set);
    if (denied) return denied;
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
