import type { ModuleListing } from '../shared/types';

type Rec = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/**
 * Only https links may reach the UI — anything else (javascript:, data:, http:)
 * is dropped so it can never land in an href.
 */
export function httpsUrl(v: unknown): string | null {
  const url = str(v);
  return url !== null && /^https:\/\//.test(url) ? url : null;
}

/** Parse an SSE `listing` payload (camelCase or REST snake_case) into ModuleListing. */
export function normalizeStreamEvent(raw: unknown): ModuleListing | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Rec;
  const id = typeof r.id === 'number' ? r.id : null;
  if (id === null) return null;
  const rawType = str(r.type);
  const type: ModuleListing['type'] = rawType === 'new-pair' || rawType === 'New Pair' ? 'new-pair' : 'listing';
  return {
    id,
    exchange: str(r.exchange) ?? str(r.exchange_name) ?? '?',
    symbol: str(r.symbol) ?? str(r.ticker_symbol) ?? '?',
    fullName: str(r.fullName) ?? str(r.ticker_full_name) ?? str(r.symbol) ?? str(r.ticker_symbol) ?? '?',
    type,
    title: str(r.title) ?? `${str(r.symbol) ?? str(r.ticker_symbol) ?? '?'} listing`,
    url: httpsUrl(r.url),
    listedAt: str(r.listedAt) ?? str(r.listing_date),
    detectedAt: str(r.detectedAt) ?? str(r.created_at),
    source: str(r.source),
  };
}
