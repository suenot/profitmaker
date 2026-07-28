import { describe, it, expect } from 'vitest';
import { chunk, pickMissing } from './leverageLoad';

describe('chunk', () => {
  it('splits into fixed-size parts, last one short', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe('pickMissing', () => {
  it('asks only for what is neither known nor already requested', () => {
    const known = new Set(['BTC/USDT:USDT']);
    const attempted = new Set(['ETH/USDT:USDT']);
    expect(pickMissing(['BTC/USDT:USDT', 'ETH/USDT:USDT', 'SOL/USDT:USDT'], known, attempted, 50))
      .toEqual(['SOL/USDT:USDT']);
  });

  it('never repeats a symbol inside one batch', () => {
    expect(pickMissing(['A', 'A', 'B'], new Set(), new Set(), 50)).toEqual(['A', 'B']);
  });

  it('caps at the server batch limit', () => {
    const visible = Array.from({ length: 120 }, (_, i) => `P${i}`);
    expect(pickMissing(visible, new Set(), new Set(), 50)).toHaveLength(50);
  });

  it('returns nothing once every visible pair was attempted', () => {
    const attempted = new Set(['A', 'B']);
    expect(pickMissing(['A', 'B'], new Set(), attempted, 50)).toEqual([]);
  });
});
