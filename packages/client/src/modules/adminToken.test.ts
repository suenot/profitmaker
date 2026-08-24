import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ADMIN_TOKEN_HEADER,
  getAdminToken,
  setAdminToken,
  withAdminToken,
} from './adminToken';

describe('adminToken', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty string when no token stored', () => {
    expect(getAdminToken()).toBe('');
  });

  it('stores and returns the token; empty value clears it', () => {
    setAdminToken('op-secret');
    expect(getAdminToken()).toBe('op-secret');
    setAdminToken('');
    expect(getAdminToken()).toBe('');
  });

  it('withAdminToken is a no-op without a stored token', () => {
    const init = { method: 'POST' } as RequestInit;
    expect(withAdminToken(init)).toBe(init);
  });

  it('withAdminToken attaches the header and preserves existing ones', () => {
    setAdminToken('op-secret');
    const init = withAdminToken({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const headers = new Headers(init.headers);
    expect(headers.get(ADMIN_TOKEN_HEADER)).toBe('op-secret');
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
