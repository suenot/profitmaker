import type {
  ServerProviderFactory,
  ServerProviderInstance,
  ServerProviderTrading,
  ServerWatchDataType,
  ProviderRequestConfig,
  ExchangeCapabilities,
  LeverageMarket,
  LeverageMarketType,
  LeverageSetting,
} from '@profitmaker/types';
import { getCCXTInstance } from '../services/ccxtCache';

/**
 * Highest leverage a market allows, read from the metadata ccxt already loaded.
 * Exchanges disagree on where they put it, so try the unified limit first, then
 * the common raw fields, then Binance's `requiredMarginPercent` (0.8% ⇒ 125x).
 */
function maxLeverageOf(market: any): number | undefined {
  const limit = Number(market?.limits?.leverage?.max);
  if (Number.isFinite(limit) && limit > 1) return limit;

  const info = market?.info || {};
  for (const field of ['maxLeverage', 'max_leverage', 'leverageMax']) {
    const value = Number(info[field]);
    if (Number.isFinite(value) && value > 1) return value;
  }

  const marginPercent = Number(info.requiredMarginPercent);
  if (Number.isFinite(marginPercent) && marginPercent > 0) {
    const derived = 100 / marginPercent;
    if (derived > 1) return derived;
  }

  return undefined;
}

/** Normalize a ccxt Leverage into our flat setting row. */
function toSetting(lev: any, source: LeverageSetting['source']): LeverageSetting {
  const long = Number(lev?.longLeverage);
  const short = Number(lev?.shortLeverage);
  const effective = Number.isFinite(long) && long > 0 ? long : Number.isFinite(short) && short > 0 ? short : undefined;
  return {
    symbol: lev?.symbol,
    leverage: effective,
    longLeverage: Number.isFinite(long) ? long : undefined,
    shortLeverage: Number.isFinite(short) ? short : undefined,
    marginMode: lev?.marginMode ?? undefined,
    source,
  };
}

const WATCH_METHOD: Record<ServerWatchDataType, string> = {
  ticker: 'watchTicker',
  trades: 'watchTrades',
  orderbook: 'watchOrderBook',
  ohlcv: 'watchOHLCV',
  balance: 'watchBalance',
};

/**
 * Built-in 'ccxt' provider. Thin wrapper over the existing ccxtCache so the
 * default data/trading path is byte-for-byte what it was before the registry
 * (zero behavior change). Other providers (e.g. module-supplied napi bindings)
 * register alongside it via the same factory contract.
 */
function makeCcxtInstance(config: ProviderRequestConfig): ServerProviderInstance {
  // Lazily resolve the cached ccxt instance; one promise per request config.
  const instanceP = getCCXTInstance(config);

  const trading: ServerProviderTrading = {
    async createOrder(symbol, type, side, amount, price, params) {
      const ex = await instanceP;
      return ex.createOrder(symbol, type, side, amount, price, params || {});
    },
    async cancelOrder(orderId, symbol) {
      const ex = await instanceP;
      return ex.cancelOrder(orderId, symbol);
    },
    async fetchMyTrades(symbol, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchMyTrades) return [];
      return ex.fetchMyTrades(symbol, since, limit);
    },
    async fetchOrders(symbol, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchOrders) return [];
      return ex.fetchOrders(symbol, since, limit);
    },
    async fetchOpenOrders(symbol) {
      const ex = await instanceP;
      if (!ex.has?.fetchOpenOrders) return [];
      return ex.fetchOpenOrders(symbol);
    },
    async fetchPositions(symbols) {
      const ex = await instanceP;
      if (!ex.has?.fetchPositions) return [];
      return ex.fetchPositions(symbols);
    },
    async fetchLedger(code, since, limit) {
      const ex = await instanceP;
      if (!ex.has?.fetchLedger) return [];
      return ex.fetchLedger(code, since, limit);
    },

    async leverageMarkets(marketType) {
      const ex = await instanceP;
      const out: LeverageMarket[] = [];
      for (const market of Object.values(ex.markets || {}) as any[]) {
        if (!market) continue;
        const type: LeverageMarketType | null = market.swap ? 'swap' : market.future ? 'future' : null;
        if (!type) continue;
        if (marketType && type !== marketType) continue;
        if (market.active === false) continue;
        out.push({ symbol: market.symbol, marketType: type, maxLeverage: maxLeverageOf(market), minLeverage: 1 });
      }
      return out.sort((a, b) => a.symbol.localeCompare(b.symbol));
    },

    async fetchLeverages(symbols) {
      const ex = await instanceP;

      // 1) Unified batch — one call for every symbol the exchange reports.
      if (ex.has?.fetchLeverages) {
        try {
          const all = await ex.fetchLeverages(symbols);
          const rows = Object.values(all || {}).map((lev: any) => toSetting(lev, 'fetchLeverages'));
          if (rows.length) return rows;
        } catch {
          // Fall through — some exchanges advertise it but reject the call shape.
        }
      }

      // 2) Per-symbol, only for what was explicitly asked for (this is the path
      //    the widget's lazy loading drives, in modest chunks).
      if (ex.has?.fetchLeverage && symbols?.length) {
        const rows: LeverageSetting[] = [];
        for (const symbol of symbols) {
          try {
            rows.push(toSetting(await ex.fetchLeverage(symbol), 'fetchLeverage'));
          } catch {
            // A symbol the account can't query is simply absent from the result.
          }
        }
        if (rows.length) return rows;
      }

      // 3) Positions carry the leverage in use — covers exchanges with neither
      //    unified call, but only for pairs that have a position/risk row.
      if (ex.has?.fetchPositions) {
        try {
          const positions = await ex.fetchPositions(symbols);
          return (positions || [])
            .filter((p: any) => p?.symbol && p?.leverage)
            .map((p: any) => ({
              symbol: p.symbol,
              leverage: Number(p.leverage),
              marginMode: p.marginMode,
              source: 'position' as const,
            }));
        } catch {
          return [];
        }
      }

      return [];
    },

    async setLeverage(leverage, symbol, params) {
      const ex = await instanceP;
      if (!ex.has?.setLeverage) {
        return { symbol, leverage, success: false, message: `${ex.id} does not support setLeverage` };
      }
      try {
        await ex.setLeverage(leverage, symbol, params || {});
        return { symbol, leverage, success: true, message: `Set to ${leverage}x` };
      } catch (err) {
        // Classification mirrors the standalone bulk scripts: "not modified" is a
        // success (the value is already what we want), an open position is a hard
        // refusal worth surfacing verbatim to the user.
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        if (lower.includes('not modified') || lower.includes('already')) {
          return { symbol, leverage, success: true, unchanged: true, message: `Already at ${leverage}x` };
        }
        if (lower.includes('position') && (lower.includes('exist') || lower.includes('open'))) {
          return { symbol, leverage, success: false, message: 'Position exists, cannot change leverage' };
        }
        return { symbol, leverage, success: false, message: message.slice(0, 160) };
      }
    },
  };

  return {
    async fetchTicker(symbol) {
      return (await instanceP).fetchTicker(symbol);
    },
    async fetchOrderBook(symbol, limit) {
      return (await instanceP).fetchOrderBook(symbol, limit);
    },
    async fetchTrades(symbol, since, limit) {
      return (await instanceP).fetchTrades(symbol, since, limit);
    },
    async fetchOHLCV(symbol, timeframe, since, limit) {
      return (await instanceP).fetchOHLCV(symbol, timeframe, since, limit);
    },
    async fetchBalance() {
      return (await instanceP).fetchBalance();
    },
    async getCapabilities(): Promise<ExchangeCapabilities> {
      const ex = await instanceP;
      return {
        has: ex.has ?? {},
        markets: Object.keys(ex.markets || {}),
        symbols: ex.symbols || [],
        timeframes: ex.timeframes
          ? (Array.isArray(ex.timeframes) ? ex.timeframes : Object.keys(ex.timeframes))
          : [],
        fees: ex.fees || {},
      };
    },
    async getMarket(symbol) {
      const ex = await instanceP;
      return ex.markets?.[symbol] ?? null;
    },
    async watch(dataType, symbol, timeframe) {
      const ex = await instanceP;
      const method = WATCH_METHOD[dataType];
      if (!ex.has?.[method]) throw new Error(`${ex.id} does not support ${method}`);
      if (dataType === 'ohlcv') {
        if (!timeframe) throw new Error('Timeframe is required for OHLCV subscription');
        return ex.watchOHLCV(symbol, timeframe);
      }
      if (dataType === 'balance') return ex.watchBalance();
      return ex[method](symbol);
    },
    supportsWatch(dataType) {
      // Capability is per-instance; resolved when the instance is awaited. We
      // can't synchronously know `has` before loadMarkets, so report true and
      // let watch() throw a precise error if unsupported (matches prior behavior).
      return dataType in WATCH_METHOD;
    },
    trading,
  };
}

export const ccxtProviderFactory: ServerProviderFactory = {
  id: 'ccxt',
  displayName: 'CCXT (built-in)',
  supportedExchanges: '*',
  priority: 100, // low priority so a specialized provider can take precedence
  create: makeCcxtInstance,
};
