import { describe, expect, it, vi } from 'vitest';
import {
  AuthError, BillingError, MissingKeyError, UpstreamError, createListingApi,
} from './apiClient';
import type { ModuleListing } from '../shared/types';

const A_LISTING: ModuleListing = {
  id: 1, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin',
  type: 'listing', title: 'DOGE listed', url: 'https://x',
  listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:00Z', source: null,
};

function apiWith(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetchImpl = vi.fn<typeof fetch>(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }));
  return { api: createListingApi({ baseUrl: 'https://api.test', apiKey: 'k', fetchImpl }), fetchImpl };
}

describe('createListingApi', () => {
  it('throws MissingKeyError without a key', () => {
    expect(() => createListingApi({ baseUrl: 'https://api.test', apiKey: null, fetchImpl: vi.fn() }))
      .toThrow(MissingKeyError);
  });

  it('sends Bearer auth and normalizes listings', async () => {
    const { api, fetchImpl } = apiWith(200, {
      listings: [{
        id: 1, exchange_name: 'binance', ticker_symbol: 'DOGE', ticker_full_name: 'Dogecoin',
        type: 'Listing', title: 'DOGE listed', pairs: [{ pair: 'DOGE/USDT', url: 'https://x' }],
        listing_date: '2026-08-23T10:00:00Z', created_at: '2026-08-23T09:59:00Z',
      }],
    });
    const out = await api.getListings(10);
    expect(out).toEqual([A_LISTING]);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/public/listings?limit=10');
  });

  it('maps 402 to BillingError', async () => {
    const { api } = apiWith(402, { error: 'balance' });
    await expect(api.getTrends()).rejects.toBeInstanceOf(BillingError);
  });

  it('maps 401 to AuthError', async () => {
    const { api } = apiWith(401, { error: 'nope' });
    await expect(api.getTrends()).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 500 and network failure to UpstreamError', async () => {
    const { api } = apiWith(500, { error: 'boom' });
    await expect(api.getStats()).rejects.toBeInstanceOf(UpstreamError);
    const failing = createListingApi({
      baseUrl: 'https://api.test', apiKey: 'k',
      fetchImpl: vi.fn(async () => { throw new Error('network down'); }),
    });
    await expect(failing.getStats()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('getExchanges returns slug list', async () => {
    const { api } = apiWith(200, { exchanges: [{ slug: 'binance' }, { slug: 'bybit' }] });
    expect(await api.getExchanges()).toEqual(['binance', 'bybit']);
  });
});
