import { describe, it, expect } from 'vitest';
import {
  decimalPlaces,
  roundToStep,
  isUsableStep,
  safeStep,
  notionalValue,
  generateClientOrderId,
} from './orderMath';

describe('decimalPlaces', () => {
  it('counts decimals in plain notation', () => {
    expect(decimalPlaces(1)).toBe(0);
    expect(decimalPlaces(0.1)).toBe(1);
    expect(decimalPlaces(0.0001)).toBe(4);
    expect(decimalPlaces(87000.12)).toBe(2);
  });

  it('counts decimals in exponential notation', () => {
    // Tick sizes below 1e-6 stringify as exponents, which a naive split('.') misses.
    expect(decimalPlaces(1e-8)).toBe(8);
    expect(decimalPlaces(1.25e-7)).toBe(9);
  });

  it('returns 0 for non-finite input', () => {
    expect(decimalPlaces(Infinity)).toBe(0);
    expect(decimalPlaces(NaN)).toBe(0);
  });
});

describe('roundToStep', () => {
  it('floors an amount onto the lot grid', () => {
    // 0.123456789 BTC on a 0.0001 lot grid must never round UP: that would buy
    // more than the user asked for.
    expect(roundToStep(0.123456789, 0.0001, 'floor')).toBe(0.1234);
    expect(roundToStep(1.99999, 0.001, 'floor')).toBe(1.999);
  });

  it('leaves values already on the grid untouched', () => {
    expect(roundToStep(0.5, 0.0001)).toBe(0.5);
    expect(roundToStep(87000, 0.01)).toBe(87000);
  });

  it('absorbs accumulated binary-float noise', () => {
    // Three "+" clicks of 0.1 in the quantity stepper produce this exact value.
    // Raw, it is not a multiple of the lot size and the venue rejects it.
    const threeClicks = 0.1 + 0.1 + 0.1;
    expect(threeClicks).toBe(0.30000000000000004);
    expect(roundToStep(threeClicks, 0.1, 'floor')).toBe(0.3);
  });

  it('does not produce new float noise in its own result', () => {
    // 0.07 / 0.01 is 7.000000000000001 as a raw double.
    expect(roundToStep(0.07, 0.01, 'floor')).toBe(0.07);
    expect(roundToStep(0.29, 0.01, 'floor')).toBe(0.29);
  });

  it('rounds a price in the direction that cannot worsen the fill', () => {
    // Buy floors (never bid higher than intended), sell ceils (never ask lower).
    expect(roundToStep(87000.126, 0.01, 'floor')).toBe(87000.12);
    expect(roundToStep(87000.126, 0.01, 'ceil')).toBe(87000.13);
    expect(roundToStep(87000.125, 0.01, 'nearest')).toBe(87000.13);
  });

  it('does not ceil a value that is already exact', () => {
    expect(roundToStep(87000.12, 0.01, 'ceil')).toBe(87000.12);
  });

  it('collapses zero and negative input to 0', () => {
    // A size that floors below one lot must become 0 so validation rejects it,
    // rather than silently becoming one whole lot.
    expect(roundToStep(0.00005, 0.0001, 'floor')).toBe(0);
    expect(roundToStep(0, 0.0001)).toBe(0);
    expect(roundToStep(-1, 0.0001)).toBe(0);
  });

  it('returns the value unchanged for an unusable step', () => {
    expect(roundToStep(1.5, 0)).toBe(1.5);
    expect(roundToStep(1.5, NaN)).toBe(1.5);
  });

  it('handles satoshi-grade tick sizes', () => {
    expect(roundToStep(0.123456789, 1e-8, 'floor')).toBe(0.12345678);
  });
});

describe('isUsableStep / safeStep', () => {
  it('accepts real tick sizes', () => {
    expect(isUsableStep(0.0001)).toBe(true);
    expect(isUsableStep(1e-8)).toBe(true);
    // A whole-unit lot (some contract markets) is legitimate.
    expect(isUsableStep(1)).toBe(true);
  });

  it('rejects digit counts masquerading as tick sizes', () => {
    // ccxt reports precision.amount = 8 on SIGNIFICANT_DIGITS venues (Bitfinex).
    // Treating that as an increment makes one stepper click worth 8 BTC.
    expect(isUsableStep(8)).toBe(false);
    expect(isUsableStep(5)).toBe(false);
    expect(safeStep(8)).toBeUndefined();
    expect(safeStep(0.0001)).toBe(0.0001);
  });

  it('rejects absent and non-finite steps', () => {
    expect(isUsableStep(undefined)).toBe(false);
    expect(isUsableStep(null)).toBe(false);
    expect(isUsableStep(0)).toBe(false);
    expect(isUsableStep(Infinity)).toBe(false);
  });
});

describe('notionalValue', () => {
  it('strips multiplication noise', () => {
    // Raw: 87000.12 * 0.3 === 26100.035999999997
    expect(notionalValue(0.3, 87000.12)).toBe(26100.036);
  });

  it('computes the quote value of a size', () => {
    expect(notionalValue(0.0001, 87000)).toBe(8.7);
    expect(notionalValue(2, 50)).toBe(100);
  });

  it('returns 0 for invalid input', () => {
    expect(notionalValue(0, 87000)).toBe(0);
    expect(notionalValue(1, 0)).toBe(0);
    expect(notionalValue(NaN, 87000)).toBe(0);
  });
});

describe('generateClientOrderId', () => {
  it('produces a 32-char alphanumeric key within exchange limits', () => {
    const id = generateClientOrderId();
    // OKX caps clientOrderId at 32 alphanumeric characters — the tightest of the
    // common limits, so satisfying it satisfies the rest.
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[a-z0-9]{32}$/);
  });

  it('is unique per call', () => {
    const ids = new Set(Array.from({ length: 500 }, generateClientOrderId));
    expect(ids.size).toBe(500);
  });
});
