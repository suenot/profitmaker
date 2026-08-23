import type { ModuleListing, StatsData, TrendsData } from '../shared/types';
import { httpsUrl } from './normalize';

export class MissingKeyError extends Error {
  constructor() { super('LISTINGAPIS_API_KEY is not configured'); this.name = 'MissingKeyError'; }
}
export class AuthError extends Error {
  constructor() { super('Invalid LISTINGAPIS_API_KEY'); this.name = 'AuthError'; }
}
export class BillingError extends Error {
  constructor() { super('MM balance exhausted'); this.name = 'BillingError'; }
}
export class UpstreamError extends Error {
  constructor(msg: string, public status?: number) { super(msg); this.name = 'UpstreamError'; }
}

/** Raw upstream REST shapes (snake_case). */
interface RestListing {
  id: number;
  exchange_name: string;
  ticker_symbol: string;
  ticker_full_name: string;
  type: string;
  title: string;
  pairs?: { pair: string; url: string }[];
  listing_date: string;
  created_at: string;
}

/**
 * Structural fetch signature. The ambient `typeof fetch` changes shape once
 * Elysia's types (and with them Bun's globals, whose fetch has `preconnect`)
 * enter the program, so injected fetches are typed structurally: both the real
 * fetch and test doubles stay assignable either way.
 */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ListingApiOptions {
  baseUrl: string;
  apiKey: string | null;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

export interface ListingApi {
  getListings(limit: number): Promise<ModuleListing[]>;
  getTrends(): Promise<TrendsData>;
  getStats(): Promise<StatsData>;
  getExchanges(): Promise<string[]>;
}

export function createListingApi(opts: ListingApiOptions): ListingApi {
  if (!opts.apiKey) throw new MissingKeyError();
  const doFetch = opts.fetchImpl ?? fetch;
  const timeout = opts.timeoutMs ?? 10_000;

  async function getJson<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      throw new UpstreamError(err instanceof Error ? err.message : String(err));
    }
    if (res.status === 402) throw new BillingError();
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new UpstreamError(`upstream ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  return {
    async getListings(limit) {
      const data = await getJson<{ listings: RestListing[] }>(`/api/public/listings?limit=${limit}&order=desc`);
      return data.listings.map(normalizeRestListing);
    },
    getTrends: () => getJson<TrendsData>('/api/public/trends'),
    getStats: () => getJson<StatsData>('/api/public/stats'),
    async getExchanges() {
      const data = await getJson<{ exchanges: { slug: string }[] }>('/api/public/exchanges');
      return data.exchanges.map((e) => e.slug);
    },
  };
}

export function normalizeRestListing(r: RestListing): ModuleListing {
  return {
    id: r.id,
    exchange: r.exchange_name,
    symbol: r.ticker_symbol,
    fullName: r.ticker_full_name,
    type: r.type === 'New Pair' ? 'new-pair' : 'listing',
    title: r.title,
    url: httpsUrl(r.pairs?.[0]?.url),
    listedAt: r.listing_date ?? null,
    detectedAt: r.created_at ?? null,
    source: null,
  };
}
