import { describe, it, expect } from 'vitest';
import { formatVolume, getAdaptivePriceDecimals } from './formatters';

describe('getAdaptivePriceDecimals', () => {
  it('keeps small Bitfinex ETC/BTC order-book prices visible and distinct', () => {
    const prices = [0.000341, 0.000342, 0.000340];
    const decimals = getAdaptivePriceDecimals(prices, 2);

    expect(decimals).toBe(6);
    expect(prices.map((price) => price.toFixed(decimals))).toEqual([
      '0.000341',
      '0.000342',
      '0.000340',
    ]);
  });

  it('preserves the configured precision as a minimum', () => {
    expect(getAdaptivePriceDecimals([64000.1, 64000.2], 2)).toBe(2);
    expect(getAdaptivePriceDecimals([0.000341, 0.000342], 8)).toBe(8);
  });

  it('falls back to the configured precision without positive prices', () => {
    expect(getAdaptivePriceDecimals([0, Number.NaN, Number.POSITIVE_INFINITY], 4)).toBe(4);
  });
});

describe('formatVolume', () => {
  it('should format zero volume correctly', () => {
    expect(formatVolume(0)).toBe('0');
  });

  it('should format billions with B suffix', () => {
    expect(formatVolume(1500000000)).toBe('1.50B');
    expect(formatVolume(2300000000)).toBe('2.30B');
  });

  it('should format millions with M suffix', () => {
    expect(formatVolume(1500000)).toBe('1.50M');
    expect(formatVolume(25600000)).toBe('25.60M');
  });

  it('should format thousands with K suffix', () => {
    expect(formatVolume(1500)).toBe('1.50K');
    expect(formatVolume(25600)).toBe('25.60K');
  });

  it('should format values >= 1 with 2 decimal places', () => {
    expect(formatVolume(123.456)).toBe('123.46');
    expect(formatVolume(1.234)).toBe('1.23');
  });

  it('should format values < 1 with 6 decimal places', () => {
    expect(formatVolume(0.123456789)).toBe('0.123457');
    expect(formatVolume(0.000001)).toBe('0.000001');
  });

  it('should handle edge cases at boundaries', () => {
    expect(formatVolume(1000000000)).toBe('1.00B'); // exactly 1B
    expect(formatVolume(1000000)).toBe('1.00M'); // exactly 1M
    expect(formatVolume(1000)).toBe('1.00K'); // exactly 1K
    expect(formatVolume(1)).toBe('1.00'); // exactly 1
  });
});
