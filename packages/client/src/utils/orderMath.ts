/**
 * Money math for order entry.
 *
 * Every price/amount in this app is a JS `number` (IEEE-754 double), which
 * cannot represent decimal fractions exactly — `0.1 + 0.2 === 0.30000000000000004`.
 * Exchanges require order sizes to land exactly on their lot grid and prices on
 * their tick grid; a value carrying binary-float noise is either rejected or
 * silently truncated by the venue. Everything here therefore does its
 * arithmetic on integers and is deliberately free of side effects so it can be
 * tested directly.
 */

/**
 * Largest number of decimals we are willing to scale by. 1e15 is the last power
 * of ten below Number.MAX_SAFE_INTEGER, so capping at 12 leaves headroom for the
 * integer part of realistic prices (a 6-figure price scaled by 1e12 is ~1e17 —
 * hence the additional safety check in `roundToStep`).
 */
const MAX_DECIMALS = 12;

/**
 * Number of decimal places in `n`, including exponential notation
 * (`1e-8` -> 8). Returns 0 for integers and non-finite input.
 */
export function decimalPlaces(n: number): number {
  if (!Number.isFinite(n)) return 0;

  const s = String(Math.abs(n));

  // Exponential form, e.g. "1e-8" or "1.25e-7".
  const eIndex = s.indexOf('e');
  if (eIndex !== -1) {
    const mantissa = s.slice(0, eIndex);
    const exponent = Number(s.slice(eIndex + 1));
    const mantissaDecimals = (mantissa.split('.')[1] || '').length;
    return Math.max(0, mantissaDecimals - exponent);
  }

  return (s.split('.')[1] || '').length;
}

export type RoundingMode = 'floor' | 'ceil' | 'nearest';

/**
 * Snap `value` onto the grid defined by `step`.
 *
 * `floor` never returns more than `value` — the correct default for order
 * amounts, since rounding a size UP would trade more than the user asked for.
 * For limit prices the conservative direction depends on side: `floor` for a
 * buy (never bid higher than intended), `ceil` for a sell (never ask lower).
 *
 * Values of zero or less collapse to 0 (negative sizes/prices are invalid and
 * are rejected by validation before they reach an exchange).
 */
export function roundToStep(value: number, step: number, mode: RoundingMode = 'floor'): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (!Number.isFinite(step) || step <= 0) return value;

  const decimals = Math.min(Math.max(decimalPlaces(value), decimalPlaces(step)), MAX_DECIMALS);
  const scale = 10 ** decimals;

  // Bail out rather than corrupt the value if scaling would leave the
  // integer-safe range (only reachable with absurdly large inputs).
  if (value * scale > Number.MAX_SAFE_INTEGER) return value;

  // Rounding here is what actually kills accumulated float noise: three "+"
  // clicks of 0.1 arrive as 0.30000000000000004 and scale to exactly 3e11.
  const scaledValue = Math.round(value * scale);
  const scaledStep = Math.round(step * scale);
  if (scaledStep <= 0) return value;

  // Integer modulo — exact for both operands, unlike `value / step`.
  const remainder = scaledValue % scaledStep;
  const floored = (scaledValue - remainder) / scaledStep;

  let steps: number;
  if (remainder === 0) {
    steps = floored;
  } else if (mode === 'ceil') {
    steps = floored + 1;
  } else if (mode === 'nearest') {
    steps = remainder * 2 >= scaledStep ? floored + 1 : floored;
  } else {
    steps = floored;
  }

  // toFixed re-lands the result on a clean decimal: (3 * 1e11) / 1e12 is exact
  // here, but neighbouring step sizes are not.
  return Number(((steps * scaledStep) / scale).toFixed(decimals));
}

/**
 * Whether a step reported by the exchange can be trusted as a real tick/lot size.
 *
 * CCXT's `market.precision.amount` means different things per venue: on
 * TICK_SIZE exchanges (96 of 110 in ccxt 4.5.45) it is an increment like
 * 0.00001, but on SIGNIFICANT_DIGITS/DECIMAL_PLACES venues it is a DIGIT COUNT.
 * Bitfinex reports `precision.amount = 8`, and treating that as an increment
 * turns one click of the quantity stepper into 8 BTC.
 *
 * Normalising this properly requires `amountToPrecision()` on the server, where
 * the ccxt instance lives. Until then, treat anything above 1 as a digit count
 * and refuse to use it as an increment.
 */
export function isUsableStep(step: number | undefined | null): step is number {
  return typeof step === 'number' && Number.isFinite(step) && step > 0 && step <= 1;
}

/**
 * The step to use for grid snapping, or `undefined` when the exchange's value
 * cannot be trusted (see `isUsableStep`) and rounding must be skipped.
 */
export function safeStep(step: number | undefined | null): number | undefined {
  return isUsableStep(step) ? step : undefined;
}

/**
 * Notional (quote-currency) value of an order, rounded to 8 decimals to strip
 * multiplication noise: 87000.12 * 0.3 is 26100.035999999997 as a raw double.
 */
export function notionalValue(amount: number, price: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(price)) return 0;
  if (amount <= 0 || price <= 0) return 0;
  return Number((amount * price).toFixed(8));
}

/**
 * Idempotency key for a single submit attempt. Regenerated per attempt and
 * reused across retries of that attempt so a duplicated request can be deduped
 * by the venue instead of becoming a second position.
 *
 * 32 lowercase hex characters: alphanumeric-only and short enough for the
 * strictest common limit (OKX caps clientOrderId at 32).
 */
export function generateClientOrderId(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef?.randomUUID) {
    return cryptoRef.randomUUID().replace(/-/g, '');
  }
  let out = '';
  while (out.length < 32) {
    out += Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0');
  }
  return out.slice(0, 32);
}
