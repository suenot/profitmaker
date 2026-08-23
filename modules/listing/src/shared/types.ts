/** Canonical listing shape used everywhere inside the module (routes, socket, widgets). */
export interface ModuleListing {
  id: number;
  exchange: string;
  symbol: string;
  fullName: string;
  /** normalized: 'listing' | 'new-pair' (upstream: 'Listing' | 'New Pair' | 'listing') */
  type: 'listing' | 'new-pair';
  title: string;
  url: string | null;
  listedAt: string | null;
  detectedAt: string | null;
  source: string | null;
}

export interface TrendingTicker {
  rank: number;
  ticker_symbol: string;
  ticker_full_name: string;
  listings_count: number;
  exchanges_count: number;
  cex_count?: number;
  dex_count?: number;
  pairs_count: number;
  first_listing_date: string;
  last_listing_date: string;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendingExchange {
  rank: number;
  exchange_id: number;
  exchange_name: string;
  exchange_slug: string;
  listings_count: number;
  unique_tickers: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendsData {
  trending_tickers: { last_7_days: TrendingTicker[]; last_30_days: TrendingTicker[] };
  trending_exchanges: { last_7_days: TrendingExchange[]; last_30_days: TrendingExchange[] };
  metadata: { last_updated: string; [k: string]: unknown };
}

export interface ActivityPeriod {
  new_listings: number;
  new_pairs: number;
  active_exchanges: number;
  top_exchange: string;
  top_exchange_listings: number;
}

export interface StatsData {
  global_stats: {
    total_tickers: number;
    total_exchanges: number;
    total_pairs: number;
    total_listings: number;
    last_updated: string;
  };
  activity_stats: { last_24_hours: ActivityPeriod; last_7_days: ActivityPeriod; last_30_days: ActivityPeriod };
  pair_stats: { most_common_quote_currencies: { quote: string; count: number }[] };
}

export type SseStatus = 'connecting' | 'up' | 'reconnecting' | 'polling';

/** /status route status: any SSE state, or 'inactive' when no API key is configured. */
export type RouteStatus = SseStatus | 'inactive';

/** Widget config for listing.live (persisted via widget `config`). */
export interface LiveConfig {
  exchanges?: string[];
  types?: ('listing' | 'new-pair')[];
  sound?: boolean;
  toast?: boolean;
  autoRestore?: boolean;
}
