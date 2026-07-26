// Leverage types — shared by the server routes, the client provider and the
// Leverages widget.
//
// Two different things are modelled here and they must not be conflated:
//   - LeverageMarket: what the EXCHANGE allows for a pair (the cap). Comes from
//     market metadata, so it's cheap and available for every pair at once.
//   - LeverageSetting: what the ACCOUNT currently has set for a pair. Private,
//     and on many exchanges only obtainable per symbol — hence the lazy loading
//     in the widget.

/** Derivative market types leverage applies to. */
export type LeverageMarketType = 'swap' | 'future';

/** Exchange-side leverage bounds for one pair (public market metadata). */
export interface LeverageMarket {
  symbol: string;
  marketType: LeverageMarketType;
  /** Highest leverage the exchange permits, when it publishes one. */
  maxLeverage?: number;
  /** Lowest permitted leverage; practically always 1. */
  minLeverage?: number;
}

/** The leverage an account currently has configured for one pair. */
export interface LeverageSetting {
  symbol: string;
  /** Effective leverage; for one-way mode exchanges this is the only value. */
  leverage?: number;
  /** Hedge-mode exchanges configure the two sides independently. */
  longLeverage?: number;
  shortLeverage?: number;
  /** 'cross' | 'isolated' when the exchange reports it. */
  marginMode?: string;
  /** Where the value came from — batch call, per-symbol call, or a position. */
  source: 'fetchLeverages' | 'fetchLeverage' | 'position';
}

/** Outcome of setting leverage on one pair. */
export interface SetLeverageResult {
  symbol: string;
  /** Leverage that was requested for this symbol. */
  leverage: number;
  success: boolean;
  /**
   * Human-readable outcome. Mirrors the classification used by the standalone
   * scripts: "already at Nx" when the exchange answers "leverage not modified",
   * and an explicit position-exists message where the exchange refuses a change
   * while a position is open.
   */
  message: string;
  /** True when the exchange reported the value was already in place. */
  unchanged?: boolean;
}

/** Target of a bulk set: an explicit number, or each pair's own maximum. */
export type LeverageTarget = number | 'max';
