import { describe, expect, it } from 'vitest';
import { createListingRing } from './ringBuffer';
import type { ModuleListing } from '../shared/types';

const mk = (id: number): ModuleListing => ({
  id, exchange: 'e', symbol: `S${id}`, fullName: `Sym ${id}`, type: 'listing',
  title: `t${id}`, url: null, listedAt: null, detectedAt: null, source: null,
});

describe('createListingRing', () => {
  it('adds and returns newest-first', () => {
    const ring = createListingRing();
    expect(ring.add(mk(1))).toBe(true);
    expect(ring.add(mk(2))).toBe(true);
    expect(ring.recent()).toEqual([mk(2), mk(1)]);
  });
  it('dedups by id', () => {
    const ring = createListingRing();
    ring.add(mk(1));
    expect(ring.add(mk(1))).toBe(false);
    expect(ring.size()).toBe(1);
  });
  it('caps at max, evicting oldest', () => {
    const ring = createListingRing(3);
    for (const id of [1, 2, 3, 4]) ring.add(mk(id));
    expect(ring.size()).toBe(3);
    expect(ring.has(1)).toBe(false);
    expect(ring.recent()).toEqual([mk(4), mk(3), mk(2)]);
  });
  it('recent(limit) slices', () => {
    const ring = createListingRing();
    ring.add(mk(1)); ring.add(mk(2)); ring.add(mk(3));
    expect(ring.recent(2)).toEqual([mk(3), mk(2)]);
  });
});
