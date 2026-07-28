/**
 * Helpers for the Leverages widget's lazy reads.
 *
 * Most exchanges have no bulk "current leverage" call (bybit only exposes it
 * per symbol, one position query each), so the widget reads leverage for the
 * pairs actually on screen instead of the whole list. These two pure functions
 * decide what to ask for; the widget owns the effect that asks.
 */

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/**
 * Symbols from `visible` that still need a read: not already known, not already
 * requested, no duplicates, capped at `limit` (the server's per-request cap).
 *
 * `attempted` holds every symbol a request was already made for — including the
 * ones the exchange returned nothing for. Without that, a pair the account
 * cannot query would stay missing forever and the effect would re-request it on
 * every render.
 */
export function pickMissing(
  visible: string[],
  known: { has(symbol: string): boolean },
  attempted: { has(symbol: string): boolean },
  limit: number,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const symbol of visible) {
    if (out.length >= limit) break;
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    if (known.has(symbol) || attempted.has(symbol)) continue;
    out.push(symbol);
  }
  return out;
}
