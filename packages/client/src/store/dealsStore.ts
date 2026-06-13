import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Deal, DealTrade } from '../types/deals';
import type { Trade } from '../types/dataProviders';

/**
 * Persisted store for the Deals widget. Replaces the previous 100%-mock,
 * local-useState implementation. Holds real deals + trades with add/edit/delete
 * and persistence, plus an `ingestTrades()` aggregation seam that turns raw
 * exchange trades (the shape returned by fetchMyTrades) into deals.
 *
 * DEFERRED (task #5 §B / blocked by #3): the LIVE data source — calling
 * fetchMyTrades(accountId) and feeding the result into ingestTrades() — is wired
 * by the Deals widget once accounts-fe's trading→accountId migration lands. This
 * store is source-agnostic: anything producing Trade[] (or DealTrade[]) can drive it.
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Format an epoch-ms timestamp as "YYYY-MM-DD HH:mm:ss" to match existing Deal fields. */
function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Human-readable duration between two epoch-ms timestamps (e.g. "6h 15m"). */
function formatDuration(openMs: number, closeMs: number): string {
  const ms = Math.max(0, closeMs - openMs);
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(' ');
}

/** Parse a Deal trade datetime string back to epoch-ms (best effort). */
function tradeTimeMs(t: DealTrade): number {
  const ms = Date.parse(t.datetime.replace(' ', 'T'));
  return Number.isNaN(ms) ? 0 : ms;
}

/** Base/quote split (e.g. "BTC" from "BTC/USDT"). */
function baseOf(symbol: string): string {
  return symbol.split('/')[0] || symbol;
}

/**
 * Recompute every aggregate field of a deal from its trades. Single source of
 * truth for deal statistics (credited/debited/total, trade counts, stocks/pairs/
 * coins, open/close timestamps, duration).
 */
export function recalculateDealStats(deal: Deal): Deal {
  const buyTrades = deal.trades.filter(t => t.side === 'buy');
  const sellTrades = deal.trades.filter(t => t.side === 'sell');

  const credited = sellTrades.reduce((sum, t) => sum + t.price * t.amount, 0);
  const debited = buyTrades.reduce((sum, t) => sum + t.price * t.amount, 0);
  const total = credited - debited;

  const stocks = new Set(deal.trades.map(t => t.stock)).size;
  const pairs = new Set(deal.trades.map(t => t.symbol)).size;
  const coins = deal.trades.reduce((sum, t) => sum + t.amount, 0);

  const times = deal.trades.map(tradeTimeMs).filter(ms => ms > 0);
  const openMs = times.length ? Math.min(...times) : 0;
  const closeMs = times.length ? Math.max(...times) : 0;

  return {
    ...deal,
    credited,
    debited,
    total,
    credited_trades: sellTrades.length,
    debited_trades: buyTrades.length,
    total_trades: deal.trades.length,
    stocks,
    pairs,
    coins,
    timestamp_open: openMs ? formatDateTime(openMs) : deal.timestamp_open,
    timestamp_closed: closeMs ? formatDateTime(closeMs) : deal.timestamp_closed,
    duration: openMs && closeMs ? formatDuration(openMs, closeMs) : deal.duration,
  };
}

let uuidCounter = 0;
function genId(prefix: string): string {
  uuidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uuidCounter.toString(36)}`;
}

/** Convert a raw exchange trade (fetchMyTrades shape) to a DealTrade. */
export function tradeToDealTrade(trade: Trade): DealTrade {
  const symbol = (trade as any).symbol || 'UNKNOWN';
  return {
    uuid: trade.id || genId('trade'),
    order: (trade as any).order || trade.id || genId('ord'),
    datetime: formatDateTime(trade.timestamp),
    stock: baseOf(symbol),
    symbol,
    type: (trade as any).type || 'market',
    side: trade.side,
    price: trade.price,
    amount: trade.amount,
    fee: (trade as any).fee?.cost ?? 0,
  };
}

interface IngestOptions {
  /** How to group ingested trades into deals. 'symbol' = one deal per symbol. */
  groupBy?: 'symbol';
  /** Name prefix for auto-created deals (default 'Auto'). */
  namePrefix?: string;
}

function emptyDeal(name: string): Deal {
  return {
    id: genId('deal'),
    name,
    note: '',
    stocks: 0,
    coins: 0,
    pairs: 0,
    credited: 0,
    debited: 0,
    total: 0,
    credited_trades: 0,
    debited_trades: 0,
    total_trades: 0,
    timestamp_open: '',
    timestamp_closed: '',
    duration: '0m',
    trades: [],
  };
}

interface DealsStore {
  deals: Deal[];

  // CRUD
  addDeal: (partial?: Partial<Deal>) => Deal;
  updateDeal: (deal: Deal) => void;
  deleteDeal: (dealId: string) => void;

  // Trade-level
  addTradesToDeal: (dealId: string, trades: DealTrade[]) => void;
  deleteTradeFromDeal: (dealId: string, tradeUuid: string) => void;

  /**
   * Aggregate raw exchange trades into deals (the data-source seam). Grouped by
   * symbol by default: trades for a symbol are merged into the existing deal that
   * already holds that symbol, otherwise a new deal is created. Idempotent on
   * trade uuid (re-ingesting the same trades won't duplicate them).
   */
  ingestTrades: (trades: Trade[], options?: IngestOptions) => void;
}

export const useDealsStore = create<DealsStore>()(
  persist(
    (set, get) => ({
      deals: [],

      addDeal: (partial) => {
        const deal = recalculateDealStats({ ...emptyDeal('New Deal'), ...partial });
        set((state) => ({ deals: [...state.deals, deal] }));
        return deal;
      },

      updateDeal: (deal) => {
        set((state) => ({
          deals: state.deals.map(d => (d.id === deal.id ? deal : d)),
        }));
      },

      deleteDeal: (dealId) => {
        set((state) => ({ deals: state.deals.filter(d => d.id !== dealId) }));
      },

      addTradesToDeal: (dealId, trades) => {
        set((state) => ({
          deals: state.deals.map(d => {
            if (d.id !== dealId) return d;
            const existingUuids = new Set(d.trades.map(t => t.uuid));
            const merged = [...d.trades, ...trades.filter(t => !existingUuids.has(t.uuid))];
            return recalculateDealStats({ ...d, trades: merged });
          }),
        }));
      },

      deleteTradeFromDeal: (dealId, tradeUuid) => {
        set((state) => ({
          deals: state.deals.map(d => {
            if (d.id !== dealId) return d;
            return recalculateDealStats({
              ...d,
              trades: d.trades.filter(t => t.uuid !== tradeUuid),
            });
          }),
        }));
      },

      ingestTrades: (trades, options) => {
        if (!trades.length) return;
        const namePrefix = options?.namePrefix ?? 'Auto';
        const dealTrades = trades.map(tradeToDealTrade);

        // Group incoming trades by symbol.
        const bySymbol = new Map<string, DealTrade[]>();
        for (const dt of dealTrades) {
          const list = bySymbol.get(dt.symbol) || [];
          list.push(dt);
          bySymbol.set(dt.symbol, list);
        }

        set((state) => {
          const deals = [...state.deals];

          for (const [symbol, incoming] of bySymbol) {
            // Find an existing deal that already tracks this symbol.
            let idx = deals.findIndex(d => d.trades.some(t => t.symbol === symbol));
            if (idx === -1) {
              deals.push(emptyDeal(`${namePrefix} ${symbol}`));
              idx = deals.length - 1;
            }
            const target = deals[idx];
            const existingUuids = new Set(target.trades.map(t => t.uuid));
            const merged = [...target.trades, ...incoming.filter(t => !existingUuids.has(t.uuid))];
            deals[idx] = recalculateDealStats({ ...target, trades: merged });
          }

          return { deals };
        });
      },
    }),
    {
      name: 'deals-store',
      partialize: (state) => ({ deals: state.deals }),
    }
  )
);
