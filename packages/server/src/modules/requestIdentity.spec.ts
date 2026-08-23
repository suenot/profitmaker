import { describe, it, expect } from 'vitest';
import { Elysia } from 'elysia';

import { recordRequestIdentity, peekRequestIdentity } from './requestIdentity';
import { rewriteForModule } from './manager';

describe('requestIdentity (WeakMap semantics)', () => {
  it('peeks undefined for a request that never recorded', () => {
    expect(peekRequestIdentity(new Request('http://localhost/api/x'))).toBeUndefined();
  });

  it('records and peeks an identity', () => {
    const request = new Request('http://localhost/api/x');
    const identity = { userId: 'u-1', authUserId: 'auth-1' };
    recordRequestIdentity(request, identity);
    expect(peekRequestIdentity(request)).toEqual(identity);
  });

  it('recording again overwrites the previous identity', () => {
    const request = new Request('http://localhost/api/x');
    recordRequestIdentity(request, { userId: 'u-1', authUserId: null });
    recordRequestIdentity(request, { userId: 'u-2', authUserId: 'auth-2' });
    expect(peekRequestIdentity(request)).toEqual({ userId: 'u-2', authUserId: 'auth-2' });
  });

  it('identity does not leak to a different request (dies with the Request)', () => {
    const a = new Request('http://localhost/api/x');
    recordRequestIdentity(a, { userId: 'u-1', authUserId: 'auth-1' });
    // GC-agnostic statement of WeakMap lifetime: a fresh Request never sees it.
    expect(peekRequestIdentity(new Request('http://localhost/api/x'))).toBeUndefined();
  });
});

describe('rewriteForModule identity headers', () => {
  const moduleRequest = (headers: Record<string, string>) =>
    new Request('http://localhost/api/modules/hello/ping', { headers });

  it('strips client-supplied x-pm-user-* and injects the recorded identity', () => {
    const request = moduleRequest({
      authorization: 'Bearer session-token',
      'x-pm-user-id': 'forged-user',
      'x-pm-user-auth-id': 'forged-auth',
    });
    recordRequestIdentity(request, { userId: 'real-user', authUserId: 'real-auth' });

    const out = rewriteForModule('hello', request);
    expect(out.headers.get('x-pm-user-id')).toBe('real-user');
    expect(out.headers.get('x-pm-user-auth-id')).toBe('real-auth');
    // Caller credentials still never cross the module boundary.
    expect(out.headers.get('authorization')).toBeNull();
    expect(out.headers.get('cookie')).toBeNull();
  });

  it('injects only x-pm-user-id when the recorded identity has no auth id', () => {
    const request = moduleRequest({ 'x-pm-user-auth-id': 'forged-auth' });
    recordRequestIdentity(request, { userId: 'local-user', authUserId: null });

    const out = rewriteForModule('hello', request);
    expect(out.headers.get('x-pm-user-id')).toBe('local-user');
    expect(out.headers.get('x-pm-user-auth-id')).toBeNull();
  });

  it('leaves both headers absent entirely when no identity was recorded', () => {
    // API_TOKEN callers (and any unauthenticated path) record nothing — a
    // forged header must not survive as the module's view of the caller.
    const request = moduleRequest({
      'x-pm-user-id': 'forged-user',
      'x-pm-user-auth-id': 'forged-auth',
    });

    const out = rewriteForModule('hello', request);
    expect(out.headers.get('x-pm-user-id')).toBeNull();
    expect(out.headers.get('x-pm-user-auth-id')).toBeNull();
  });

  it('still rewrites the mount prefix and strips proxy-authorization', () => {
    const request = moduleRequest({ 'proxy-authorization': 'Basic x' });
    const out = rewriteForModule('hello', request);
    expect(new URL(out.url).pathname).toBe('/ping');
    expect(out.headers.get('proxy-authorization')).toBeNull();
  });
});

describe('identity flows through the Elysia lifecycle', () => {
  // The WeakMap is keyed on Request identity, so this only works if Elysia
  // hands the route handler the SAME Request object the lifecycle hook saw.
  it('recorded in onBeforeHandle, peekable in the route handler', async () => {
    const identity = { userId: 'u-1', authUserId: 'auth-1' };
    const app = new Elysia()
      .onBeforeHandle(({ request }) => {
        recordRequestIdentity(request, identity);
      })
      .get('/api/modules/hello/who', ({ request }) => peekRequestIdentity(request) ?? null);

    const res = await app.handle(new Request('http://localhost/api/modules/hello/who'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(identity);
  });
});
