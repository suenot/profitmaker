/**
 * Session P&L from the account's own fills.
 *
 * scalper-iced showed this panel against a stub (`src/panel/pnl.rs` — every
 * field hardcoded to zero) because the Rust app had no private feed. We do have
 * one, so the numbers are computed here for real, from `fetchMyTrades`.
 *
 * Accounting is average-cost, sign-aware, and handles a flip (a fill that closes
 * the position and opens the other way) by realizing only the closing part.
 * Average cost rather than FIFO on purpose: exchanges report fills, not lots, so
 * FIFO would invent a lot structure the venue never had.
 */

export interface MyTrade {
  timestamp: number;
  price: number;
  amount: number;
  side: 'buy' | 'sell';
  symbol?: string;
  fee?: { cost?: number; currency?: string } | null;
  fees?: { cost?: number; currency?: string }[] | null;
}

export interface PnlSummary {
  /** Realized on closing fills in the window. */
  realized: number;
  /** Fees paid on every fill in the window, however the venue reported them. */
  fees: number;
  /** Fills counted. */
  trades: number;
  /** Share of closing fills that realized a profit, 0..100. */
  winRate: number;
  /** Closing fills — the denominator behind winRate. */
  closedTrades: number;
}

/** Milliseconds since local midnight, for the usual "today" window. */
export function startOfToday(now = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function feeOf(trade: MyTrade): number {
  if (Array.isArray(trade.fees) && trade.fees.length) {
    return trade.fees.reduce((sum, f) => sum + (Number(f?.cost) || 0), 0);
  }
  return Number(trade.fee?.cost) || 0;
}

/**
 * Fold fills into a session summary. Fills are grouped per symbol — a position
 * in one instrument must not net against another's — and processed oldest
 * first, which is the only order in which average cost means anything.
 */
export function summarizePnl(trades: MyTrade[], since = 0): PnlSummary {
  const window = trades
    .filter(t => Number.isFinite(t?.price) && Number.isFinite(t?.amount) && (t.timestamp ?? 0) >= since)
    .sort((a, b) => a.timestamp - b.timestamp);

  const books = new Map<string, { size: number; avgEntry: number }>();
  let realized = 0;
  let fees = 0;
  let closedTrades = 0;
  let wins = 0;

  for (const trade of window) {
    fees += feeOf(trade);

    const key = trade.symbol ?? '';
    const book = books.get(key) ?? { size: 0, avgEntry: 0 };
    // Signed size: long is positive, short negative, so one code path covers both.
    const delta = trade.side === 'sell' ? -trade.amount : trade.amount;

    if (book.size === 0 || Math.sign(book.size) === Math.sign(delta)) {
      // Opening or adding: the average entry moves, nothing is realized.
      const newSize = book.size + delta;
      book.avgEntry = newSize !== 0
        ? (book.avgEntry * Math.abs(book.size) + trade.price * Math.abs(delta)) / Math.abs(newSize)
        : 0;
      book.size = newSize;
    } else {
      // Reducing, closing, or flipping. Only what offsets the existing position
      // realizes; anything beyond it opens a new one at this fill's price.
      const closing = Math.min(Math.abs(delta), Math.abs(book.size));
      const direction = book.size > 0 ? 1 : -1;
      const gain = (trade.price - book.avgEntry) * closing * direction;
      realized += gain;
      closedTrades += 1;
      if (gain > 0) wins += 1;

      const remaining = Math.abs(delta) - closing;
      book.size += delta;
      if (remaining > 0) book.avgEntry = trade.price;
      else if (book.size === 0) book.avgEntry = 0;
    }

    books.set(key, book);
  }

  return {
    realized,
    fees,
    trades: window.length,
    closedTrades,
    winRate: closedTrades > 0 ? (wins / closedTrades) * 100 : 0,
  };
}

/** Open-position P&L, from whatever shape the exchange's position row has. */
export function unrealizedOf(position: any | null | undefined): number {
  if (!position) return 0;
  const reported = Number(position.unrealizedPnl ?? position.unrealisedPnl);
  if (Number.isFinite(reported)) return reported;

  // Not every venue reports it; mark and entry are enough to derive it.
  const size = Number(position.contracts ?? 0);
  const entry = Number(position.entryPrice ?? 0);
  const mark = Number(position.markPrice ?? 0);
  if (!size || !entry || !mark) return 0;
  const direction = position.side === 'short' ? -1 : 1;
  return (mark - entry) * Math.abs(size) * direction;
}
