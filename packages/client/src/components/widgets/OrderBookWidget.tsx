import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useOrderBookWidgetsStore } from '../../store/orderBookWidgetStore';
import { useGroupStore } from '../../store/groupStore';
import { OrderBook, OrderBookEntry, MarketType } from '../../types/dataProviders';

interface OrderBookWidgetV2Props {
  dashboardId?: string;
  widgetId?: string;
  selectedGroupId?: string;
  initialExchange?: string;
  initialSymbol?: string;
}

const OrderBookWidgetV2Inner: React.FC<OrderBookWidgetV2Props> = ({
  dashboardId = 'default',
  widgetId = 'orderbook-widget-v2',
  selectedGroupId,
  initialExchange = 'binance',
  initialSymbol = 'BTC/USDT'
}) => {
  const { 
    subscribe, 
    unsubscribe, 
    getOrderBook, 
    initializeOrderBookData,
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  const { getWidget, updateWidget, setWidgetSettings } = useOrderBookWidgetsStore();
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();

  const widget = getWidget(widgetId);

  // Resolve the instrument from THIS widget's bound group (selectedGroupId),
  // falling back to the global picker, then the transparent group — identical to
  // Chart and Trades. Reading only the global picker here meant a remote group
  // retarget (PUT /api/groups/:id) moved the chart but left the order book on the
  // old symbol; deriving from the bound group makes the subscription effect below
  // (deps: exchange/symbol/market) resubscribe correctly.
  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  const selectedGroup = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();
  const exchange = selectedGroup?.exchange || 'binance';
  const symbol = selectedGroup?.tradingPair || 'BTC/USDT';
  const market = (selectedGroup?.market as MarketType) || 'spot';
  
  // Use widget settings from store
  const {
    displayDepth,
    showCumulative,
    priceDecimals,
    amountDecimals,
    isSubscribed,
    isLoading,
    error
  } = widget;

  // Get data from store (automatically updated) with market from store
  const rawOrderBook = getOrderBook(exchange, symbol, market as any);
  const activeSubscriptions = getActiveSubscriptionsList();

  // Check if there's an active subscription for current exchange/symbol/market
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'orderbook' &&
    sub.key.market === market
  );

  // Processing and formatting orderbook data
  const processedOrderBook = useMemo(() => {
    if (!rawOrderBook) {
      return null;
    }

    try {
      // Check that data is in correct format
      if (!rawOrderBook.bids || !rawOrderBook.asks ||
          !Array.isArray(rawOrderBook.bids) || !Array.isArray(rawOrderBook.asks)) {
        return null;
      }

      const formatEntry = (entry: OrderBookEntry | [number, number]) => {
        // Handle array format [price, amount] from CCXT Pro
        if (Array.isArray(entry)) {
          const [price, amount] = entry;
          if (typeof price !== 'number' || typeof amount !== 'number') {
            return null;
          }
          return {
            price,
            amount,
            total: price * amount
          };
        }

        // Handle object format {price, amount}
        if (!entry || typeof entry.price !== 'number' || typeof entry.amount !== 'number') {
          return null;
        }
        return {
          price: entry.price,
          amount: entry.amount,
          total: entry.price * entry.amount
        };
      };

      // Take only needed depth and filter null values
      const bids = (rawOrderBook.bids as (OrderBookEntry | [number, number])[]).slice(0, displayDepth).map(formatEntry).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      const asks = (rawOrderBook.asks as (OrderBookEntry | [number, number])[]).slice(0, displayDepth).map(formatEntry).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    // Add cumulative volumes if needed
    if (showCumulative) {
      let bidsCumulative = 0;
      let asksCumulative = 0;

      bids.forEach(bid => {
        bidsCumulative += bid.amount;
        (bid as any).cumulative = bidsCumulative;
      });

      asks.forEach(ask => {
        asksCumulative += ask.amount;
        (ask as any).cumulative = asksCumulative;
      });
    }

      const result = {
        bids,
        asks,
        timestamp: rawOrderBook.timestamp,
        spread: asks.length > 0 && bids.length > 0 ? asks[0].price - bids[0].price : 0,
        spreadPercent: asks.length > 0 && bids.length > 0
          ? ((asks[0].price - bids[0].price) / bids[0].price) * 100
          : 0
      };

      return result;
    } catch (error) {
      console.error(`❌ [OrderBook-${widgetId}] Error processing orderbook data:`, error);
      return null;
    }
  }, [rawOrderBook, displayDepth, showCumulative, widgetId]);

  // Statistics
  const stats = useMemo(() => {
    if (!processedOrderBook) {
      return { 
        bidVolume: 0, 
        askVolume: 0, 
        bidCount: 0, 
        askCount: 0,
        totalVolume: 0,
        bestBid: 0,
        bestAsk: 0
      };
    }

    const bidVolume = processedOrderBook.bids.reduce((sum, bid) => sum + bid.total, 0);
    const askVolume = processedOrderBook.asks.reduce((sum, ask) => sum + ask.total, 0);
    const bestBid = processedOrderBook.bids.length > 0 ? processedOrderBook.bids[0].price : 0;
    const bestAsk = processedOrderBook.asks.length > 0 ? processedOrderBook.asks[0].price : 0;

    return { 
      bidVolume, 
      askVolume, 
      bidCount: processedOrderBook.bids.length,
      askCount: processedOrderBook.asks.length,
      totalVolume: bidVolume + askVolume,
      bestBid,
      bestAsk
    };
  }, [processedOrderBook]);

  // Track subscription changes to restart when settings change
  const previousSubscriptionRef = useRef<{
    exchange: string;
    symbol: string;
    market: MarketType;
  } | null>(null);

  // REST data initialization and WebSocket subscription management
  useEffect(() => {
    if (!activeProviderId) {
      return;
    }

    const currentSubscription = {
      exchange,
      symbol,
      market
    };

    // Check if subscription parameters changed
    const subscriptionChanged = !previousSubscriptionRef.current ||
      previousSubscriptionRef.current.exchange !== exchange ||
      previousSubscriptionRef.current.symbol !== symbol ||
      previousSubscriptionRef.current.market !== market;

    if (subscriptionChanged) {
      // Update loading state
      updateWidget(widgetId, { isLoading: true, error: null });

      // Initialize with REST data first
      const initializeData = async () => {
        try {
          await initializeOrderBookData(exchange, symbol, market);

          // Start WebSocket subscription for real-time updates
          const subscriberId = `${dashboardId}-${widgetId}`;
          const subscriptionResult = await subscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);

          if (subscriptionResult.success) {
            updateWidget(widgetId, {
              isSubscribed: true,
              isLoading: false,
              error: null
            });
          } else {
            updateWidget(widgetId, {
              isSubscribed: false,
              isLoading: false,
              error: subscriptionResult.error || 'Subscription failed'
            });
          }

        } catch (error) {
          updateWidget(widgetId, {
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load orderbook data'
          });
        }
      };

      initializeData();
      previousSubscriptionRef.current = currentSubscription;
    }

    // Cleanup function
    return () => {
      if (previousSubscriptionRef.current) {
        const subscriberId = `${dashboardId}-${widgetId}`;
        unsubscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
      }
    };
  }, [exchange, symbol, market, activeProviderId, widgetId, dashboardId, initializeOrderBookData, subscribe, unsubscribe, updateWidget]);

  const handleSubscribe = async () => {
    if (!activeProviderId) {
      updateWidget(widgetId, { error: 'No active provider' });
      return;
    }

    try {
      updateWidget(widgetId, { isLoading: true, error: null });

      // Initialize with REST data first
      await initializeOrderBookData(exchange, symbol, market);

      // Start WebSocket subscription
      const subscriberId = `${dashboardId}-${widgetId}`;
      const subscriptionResult = await subscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);

      if (subscriptionResult.success) {
        updateWidget(widgetId, {
          isSubscribed: true,
          isLoading: false,
          error: null
        });
      } else {
        updateWidget(widgetId, {
          isSubscribed: false,
          isLoading: false,
          error: subscriptionResult.error || 'Subscription failed'
        });
      }
    } catch (error) {
      updateWidget(widgetId, {
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false,
        isSubscribed: false
      });
    }
  };

  const handleUnsubscribe = () => {
    const subscriberId = `${dashboardId}-${widgetId}`;
    unsubscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
    updateWidget(widgetId, { isSubscribed: false });
  };

  const formatPrice = (price: number): string => {
    return price.toFixed(priceDecimals);
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(amountDecimals);
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Virtualized Asks Component (sells - top)
  const VirtualizedAsks = ({ asks }: { asks: any[] }) => {
    const asksParentRef = useRef<HTMLDivElement>(null);
    
    const asksVirtualizer = useVirtualizer({
      count: asks.length,
      getScrollElement: () => asksParentRef.current,
      estimateSize: () => 24, // Fixed height for compact design
      measureElement: undefined, // Disable dynamic measurement for performance
    });

    return (
      <div ref={asksParentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: asksVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {asksVirtualizer.getVirtualItems().map((virtualRow) => {
            const ask = asks[asks.length - 1 - virtualRow.index]; // Reverse order for asks
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-3 gap-2 text-xs px-2 py-1 bg-red-50/20 hover:bg-red-50/30 dark:bg-red-900/20 dark:hover:bg-red-900/30 border-l-2 border-red-500 dark:border-red-400"
              >
                <div className="font-mono text-red-600 dark:text-red-400 leading-none">{formatPrice(ask.price)}</div>
                <div className="font-mono text-right text-terminal-text leading-none">{formatAmount(ask.amount)}</div>
                <div className="font-mono text-right text-terminal-muted leading-none">
                  {showCumulative ? formatAmount((ask as any).cumulative || 0) : formatVolume(ask.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Virtualized Bids Component (buys - bottom)
  const VirtualizedBids = ({ bids }: { bids: any[] }) => {
    const bidsParentRef = useRef<HTMLDivElement>(null);
    
    const bidsVirtualizer = useVirtualizer({
      count: bids.length,
      getScrollElement: () => bidsParentRef.current,
      estimateSize: () => 24, // Fixed height for compact design
      measureElement: undefined, // Disable dynamic measurement for performance
    });

    return (
      <div ref={bidsParentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: bidsVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {bidsVirtualizer.getVirtualItems().map((virtualRow) => {
            const bid = bids[virtualRow.index];
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-3 gap-2 text-xs px-2 py-1 bg-green-50/20 hover:bg-green-50/30 dark:bg-green-900/20 dark:hover:bg-green-900/30 border-l-2 border-green-500 dark:border-green-400"
              >
                <div className="font-mono text-green-600 dark:text-green-400 leading-none">{formatPrice(bid.price)}</div>
                <div className="font-mono text-right text-terminal-text leading-none">{formatAmount(bid.amount)}</div>
                <div className="font-mono text-right text-terminal-muted leading-none">
                  {showCumulative ? formatAmount((bid as any).cumulative || 0) : formatVolume(bid.total)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="w-full h-full flex flex-col">
      {/* Error display */}
      {error && (
        <div className="text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm flex-shrink-0">
          {error}
        </div>
      )}

      {!processedOrderBook ? (
        <div className="flex-1 flex items-center justify-center text-terminal-muted">
          <div className="text-center">
            {isLoading
              ? 'Loading orderbook data...'
              : isSubscribed
                ? 'Waiting for data...'
                : 'Subscribe to receive orderbook data'}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-1">
          {/* Headers */}
          <div className="grid grid-cols-3 gap-2 text-xs font-medium text-terminal-muted px-2 py-1 border-b border-terminal-border">
            <div>Price</div>
            <div className="text-right">Volume</div>
            <div className="text-right">{showCumulative ? 'Cumul.' : 'Total'}</div>
          </div>

          {/* Asks (sells) - top - Virtualized */}
          <VirtualizedAsks asks={processedOrderBook.asks} />

          {/* Spread */}
          <div className="bg-terminal-accent p-2 text-center border-y border-terminal-border flex-shrink-0">
            <div className="text-xs text-terminal-text">Spread: {formatPrice(processedOrderBook.spread)}</div>
            <div className="text-xs text-terminal-muted">({processedOrderBook.spreadPercent.toFixed(4)}%)</div>
          </div>

          {/* Bids (buys) - bottom - Virtualized */}
          <VirtualizedBids bids={processedOrderBook.bids} />
        </div>
      )}
    </div>
  );
};

export const OrderBookWidgetV2: React.FC<OrderBookWidgetV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <OrderBookWidgetV2Inner {...props} />
    </ErrorBoundary>
  );
}; 