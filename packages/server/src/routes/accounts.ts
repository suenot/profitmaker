import { Elysia, t } from 'elysia';
import { getSsoContextFromRequest } from '../middleware/requireUser';
import { invalidateCredentialCache, proxyMeExchanges } from '../services/authAccounts';

/**
 * /api/accounts/* — a thin proxy in front of the auth service's
 * `/api/v1/me/exchanges*` endpoints, forwarding the CALLER's own SSO JWT.
 *
 * Central exchange accounts (keys, grants) live in auth.marketmaker.cc, not in
 * this server's DB. Proxying keeps the terminal a single API origin (the browser
 * never calls auth cross-origin) while auth scopes every response to the bearer.
 * These routes never touch the internal secret — they are pure user-plane.
 *
 * The global Bearer gate in index.ts already rejects unauthenticated requests;
 * here we additionally require a genuine SSO identity (not API_TOKEN / local
 * session), since central accounts only exist for ecosystem users.
 *
 * Client-facing shapes mirror auth 1:1 (see authAccounts contract):
 *   GET    /api/accounts                  -> [{ id, exchange, label, read_only,
 *                                              api_key_suffix?, has_ro_keys, owner_user_id,
 *                                              access_level, shared, created_at }]
 *   POST   /api/accounts                  { exchange*, label?, api_key*, api_secret*,
 *                                            passphrase?, read_only?, api_key_ro?,
 *                                            api_secret_ro?, passphrase_ro? } -> 201
 *   PATCH  /api/accounts/:id              { label?, api_key?, api_secret?,
 *                                            passphrase?, read_only? } -> 200
 *   DELETE /api/accounts/:id              -> { ok: true }
 *   GET    /api/accounts/:id/grants       -> [{ id, grantee_user_id, grantee_email,
 *                                              access_level, created_at }]
 *   POST   /api/accounts/:id/grants       { grantee_email?|grantee_user_id?,
 *                                            access_level } -> 201
 *   DELETE /api/accounts/:id/grants/:gid  -> { ok: true }
 */
export const accountRoutes = new Elysia({ prefix: '/api/accounts' })

  // List own + shared accounts (metadata only; never any key material).
  .get('/', async ({ request, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body } = await proxyMeExchanges({ bearer: ctx.bearer, method: 'GET' });
    set.status = status;
    return body;
  })

  // Create an account (keys go to auth's vault; nothing sensitive is stored here).
  .post('/', async ({ request, body, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body: out } = await proxyMeExchanges({ bearer: ctx.bearer, method: 'POST', body });
    set.status = status;
    return out;
  }, {
    body: t.Object({
      exchange: t.String(),
      label: t.Optional(t.String()),
      api_key: t.String(),
      api_secret: t.String(),
      passphrase: t.Optional(t.String()),
      read_only: t.Optional(t.Boolean()),
      api_key_ro: t.Optional(t.String()),
      api_secret_ro: t.Optional(t.String()),
      passphrase_ro: t.Optional(t.String()),
    }),
  })

  // Update metadata and/or rotate write-only keys on an owned account.
  .patch('/:id', async ({ request, params, body, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const result = await proxyMeExchanges({
      bearer: ctx.bearer, method: 'PATCH', subPath: `/${params.id}`, body,
    });
    if (result.status >= 200 && result.status < 300) invalidateCredentialCache(params.id);
    set.status = result.status;
    return result.body;
  }, {
    body: t.Object({
      label: t.Optional(t.String()),
      api_key: t.Optional(t.String()),
      api_secret: t.Optional(t.String()),
      passphrase: t.Optional(t.String()),
      read_only: t.Optional(t.Boolean()),
      api_key_ro: t.Optional(t.String()),
      api_secret_ro: t.Optional(t.String()),
      passphrase_ro: t.Optional(t.String()),
    }),
  })

  // Delete an account by id.
  .delete('/:id', async ({ request, params, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body } = await proxyMeExchanges({ bearer: ctx.bearer, method: 'DELETE', subPath: `/${params.id}` });
    if (status >= 200 && status < 300) invalidateCredentialCache(params.id);
    set.status = status;
    return body;
  })

  // List grants on an account the caller owns.
  .get('/:id/grants', async ({ request, params, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body } = await proxyMeExchanges({ bearer: ctx.bearer, method: 'GET', subPath: `/${params.id}/grants` });
    set.status = status;
    return body;
  })

  // Share an account with another user at read|trade level.
  .post('/:id/grants', async ({ request, params, body, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body: out } = await proxyMeExchanges({
      bearer: ctx.bearer, method: 'POST', subPath: `/${params.id}/grants`, body,
    });
    set.status = status;
    return out;
  }, {
    body: t.Object({
      grantee_email: t.Optional(t.String()),
      grantee_user_id: t.Optional(t.String()),
      access_level: t.Union([t.Literal('read'), t.Literal('trade')]),
    }),
  })

  // Revoke a grant.
  .delete('/:id/grants/:grantId', async ({ request, params, set }) => {
    const ctx = await getSsoContextFromRequest(request);
    if (!ctx) { set.status = 401; return { error: 'SSO authentication required' }; }
    const { status, body } = await proxyMeExchanges({
      bearer: ctx.bearer, method: 'DELETE', subPath: `/${params.id}/grants/${params.grantId}`,
    });
    set.status = status;
    return body;
  });
