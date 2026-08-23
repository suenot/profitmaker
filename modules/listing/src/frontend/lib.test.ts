import { describe, expect, it, vi } from 'vitest';
import { defaultLiveConfig, formatTime, passFilters, restoreIfMinimized } from './lib';
import type { ModuleListing } from '../shared/types';

const L = (over: Partial<ModuleListing> = {}): ModuleListing => ({
  id: 1, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin', type: 'listing',
  title: 't', url: null, listedAt: null, detectedAt: null, source: null, ...over,
});

describe('passFilters', () => {
  it('passes everything with default config', () => {
    expect(passFilters(L(), defaultLiveConfig())).toBe(true);
  });
  it('filters by exchange', () => {
    expect(passFilters(L({ exchange: 'okx' }), { ...defaultLiveConfig(), exchanges: ['binance'] })).toBe(false);
    expect(passFilters(L({ exchange: 'okx' }), { ...defaultLiveConfig(), exchanges: ['okx', 'bybit'] })).toBe(true);
  });
  it('filters by type', () => {
    expect(passFilters(L({ type: 'new-pair' }), { ...defaultLiveConfig(), types: ['listing'] })).toBe(false);
  });
});

describe('formatTime', () => {
  it('formats HH:MM:SS local', () => {
    expect(formatTime('2026-08-23T10:30:05Z')).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
  it('empty for null', () => { expect(formatTime(null)).toBe(''); });
});

describe('restoreIfMinimized', () => {
  it('un-minimizes only when minimized', () => {
    const calls: [string, string][] = [];
    const store = {
      dashboards: [{ id: 'd1', widgets: [{ id: 'w1', isMinimized: true }, { id: 'w2', isMinimized: false }] }],
      toggleWidgetMinimized: (d: string, w: string) => { calls.push([d, w]); },
    };
    restoreIfMinimized(store, 'w1');
    restoreIfMinimized(store, 'w2');
    expect(calls).toEqual([['d1', 'w1']]);
  });
  it('no-op for unknown widget', () => {
    const store = { dashboards: [], toggleWidgetMinimized: vi.fn() };
    expect(() => restoreIfMinimized(store, 'zzz')).not.toThrow();
  });
});
