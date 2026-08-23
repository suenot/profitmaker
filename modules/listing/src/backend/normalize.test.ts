import { describe, expect, it } from 'vitest';
import { normalizeStreamEvent } from './normalize';

describe('normalizeStreamEvent', () => {
  it('maps camelCase stream payload', () => {
    expect(normalizeStreamEvent({
      id: 7, exchange: 'bybit', symbol: 'PEPE', type: 'listing',
      title: 'PEPE listed', url: 'https://bybit.com/x',
      listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:59Z', source: 'tg',
    })).toEqual({
      id: 7, exchange: 'bybit', symbol: 'PEPE', fullName: 'PEPE', type: 'listing',
      title: 'PEPE listed', url: 'https://bybit.com/x',
      listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:59Z', source: 'tg',
    });
  });
  it('maps new-pair type', () => {
    const out = normalizeStreamEvent({ id: 8, exchange: 'e', symbol: 'S', type: 'new-pair', title: 't' });
    expect(out?.type).toBe('new-pair');
  });
  it('maps REST-style snake_case payload', () => {
    const out = normalizeStreamEvent({
      id: 9, exchange_name: 'okx', ticker_symbol: 'WIF', ticker_full_name: 'dogwifhat',
      type: 'New Pair', title: 'WIF pair', listing_date: '2026-08-23T10:00:00Z', created_at: '2026-08-23T09:58:00Z',
    });
    expect(out).toMatchObject({ id: 9, exchange: 'okx', symbol: 'WIF', fullName: 'dogwifhat', type: 'new-pair' });
  });
  it('drops non-https urls so javascript: never reaches an href', () => {
    const out = normalizeStreamEvent({ id: 10, exchange: 'e', symbol: 'S', type: 'listing', title: 't', url: 'javascript:alert(1)' });
    expect(out?.url).toBeNull();
    const http = normalizeStreamEvent({ id: 11, exchange: 'e', symbol: 'S', type: 'listing', title: 't', url: 'http://e.com/x' });
    expect(http?.url).toBeNull();
  });
  it('keeps https urls', () => {
    const out = normalizeStreamEvent({ id: 12, exchange: 'e', symbol: 'S', type: 'listing', title: 't', url: 'https://e.com/x' });
    expect(out?.url).toBe('https://e.com/x');
  });
  it('returns null for garbage', () => {
    expect(normalizeStreamEvent(null)).toBeNull();
    expect(normalizeStreamEvent({ nope: 1 })).toBeNull();
    expect(normalizeStreamEvent('x')).toBeNull();
  });
});
