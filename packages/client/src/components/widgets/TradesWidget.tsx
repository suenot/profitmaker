import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { Label } from '../ui/label';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useTradesWidgetsStore } from '../../store/tradesWidgetStore';
import { useGroupStore } from '../../store/groupStore';
import { Trade, MarketType } from '../../types/dataProviders';
import { DollarSign, Hash, Clock, TrendingUp, TrendingDown } from 'lucide-react';

interface TradesWidgetV2Props {
  dashboardId?: string;
  widgetId?: string;
  selectedGroupId?: string;
}

const TradesWidgetV2Inner: React.FC<TradesWidgetV2Props> = ({
  dashboardId = 'default',
  widgetId = 'trades-widget-v2',
  selectedGroupId
}) => {
  const { 
    getTrades, 
    subscribe,
    unsubscribe,
    initializeTradesData,
    getActiveSubscriptionsList,
    activeProviderId
  } = useDataProviderStore();

  // Store integration
  const { getWidget, updateWidget } = useTradesWidgetsStore();
  const widgetState = getWidget(widgetId);

  // Group store integration - единый источник данных о выбранном инструменте
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  // Fallback to transparent group if no group is selected
  const selectedGroup = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();

  // Проверка полноты выбранного инструмента. This widget renders the PUBLIC
  // trade tape (initializeTradesData / getTrades take no accountId), so
  // `account` is deliberately NOT part of this gate. The user's own fills live
  // in MyTradesWidget / UserTradesTab, which gate on an account themselves.
  const isInstrumentSelected = selectedGroup &&
    selectedGroup.exchange &&
    selectedGroup.market &&
    selectedGroup.tradingPair;

  // Получаем данные инструмента из selectedGroup
  const exchange = selectedGroup?.exchange || 'binance';
  const symbol = selectedGroup?.tradingPair || 'BTC/USDT';
  const market = (selectedGroup?.market as MarketType) || 'spot';

  // Get data from store
  const rawTrades = getTrades(exchange, symbol, market);
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Debug logging for store data
  useEffect(() => {
    console.log(`📊 [TradesWidget] Store data for ${exchange}:${market}:${symbol} - ${rawTrades.length} trades`);
    if (rawTrades.length > 0) {
      console.log(`📊 [TradesWidget] Store: First trade: ${JSON.stringify(rawTrades[0])}`);
      console.log(`📊 [TradesWidget] Store: Last trade: ${JSON.stringify(rawTrades[rawTrades.length - 1])}`);
    }
  }, [rawTrades.length, exchange, symbol, market]);
  
  // Check if there's an active subscription for current exchange/symbol
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'trades' &&
    sub.key.market === market
  );

  // Widget state
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Ref for tracking previous subscription
  const previousSubscriptionRef = useRef<{
    exchange: string;
    symbol: string;
    market: MarketType;
    isAggregated: boolean;
    tradesLimit: number;
  } | null>(null);

  // Filters state (можно потом вынести в store)
  const [filters] = useState({
    side: 'all',
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: ''
  });

  // Sorting state (можно потом вынести в store)
  const [sortBy] = useState<'timestamp' | 'price' | 'amount'>('timestamp');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  // REST data initialization
  useEffect(() => {
    if (!isInstrumentSelected || !activeProviderId) return;

    const loadInitialTrades = async () => {
      try {
        updateWidget(widgetId, { isLoading: true, error: null });
        setIsDataLoaded(false);

        console.log(`🚀 [TradesWidget] Loading initial trades via REST for ${exchange}:${market}:${symbol} (aggregated: ${widgetState.isAggregatedTrades}, limit: ${widgetState.tradesLimit})`);
        
        const trades = await initializeTradesData(
          exchange, 
          symbol, 
          market, 
          widgetState.tradesLimit,
          widgetState.isAggregatedTrades
        );
        
        if (trades && trades.length > 0) {
          // Trades автоматически сохранены в store через initializeTradesData
          setIsDataLoaded(true);
          console.log(`✅ [TradesWidget] Initial trades loaded via REST: ${trades.length} trades`);
          console.log(`📊 [TradesWidget] First trade: ${JSON.stringify(trades[0])}`);
          console.log(`📊 [TradesWidget] Last trade: ${JSON.stringify(trades[trades.length - 1])}`);
        } else {
          console.warn(`⚠️ [TradesWidget] No initial trades received via REST`);
          setIsDataLoaded(true); // Считаем загруженным даже если пусто
        }
        
        updateWidget(widgetId, { isLoading: false });
      } catch (error) {
        console.error(`❌ [TradesWidget] Failed to load initial trades:`, error);
        updateWidget(widgetId, { 
          error: error instanceof Error ? error.message : 'Failed to load trades',
          isLoading: false 
        });
        setIsDataLoaded(true);
      }
    };

    loadInitialTrades();
  }, [isInstrumentSelected, exchange, symbol, market, widgetState.isAggregatedTrades, widgetState.tradesLimit, activeProviderId, initializeTradesData, updateWidget, widgetId]);

  // Subscription management
  const handleSubscribe = async () => {
    if (!activeProviderId || !isInstrumentSelected) {
      updateWidget(widgetId, { error: 'No active provider or instrument selected' });
      return;
    }

    try {
      updateWidget(widgetId, { isLoading: true, error: null });
      
      const subscriberId = `${dashboardId}-${widgetId}`;
      const config = {
        isAggregated: widgetState.isAggregatedTrades,
        tradesLimit: widgetState.tradesLimit
      };
      
      const result = await subscribe(
        subscriberId, 
        exchange, 
        symbol, 
        'trades', 
        undefined, // no timeframe for trades
        market,
        config
      );
      
      if (result.success) {
        updateWidget(widgetId, { 
          isSubscribed: true, 
          isLoading: false 
        });
        
        // Save current settings as previous AFTER successful subscription
        previousSubscriptionRef.current = { 
          exchange, 
          symbol, 
          market, 
          isAggregated: widgetState.isAggregatedTrades,
          tradesLimit: widgetState.tradesLimit
        };
        
        console.log(`📊 [TradesWidget] Subscribed to ${exchange}:${market}:${symbol} (aggregated: ${widgetState.isAggregatedTrades}, limit: ${widgetState.tradesLimit})`);
      } else {
        updateWidget(widgetId, { 
          error: result.error || 'Subscription failed',
          isLoading: false 
        });
      }
    } catch (error) {
      updateWidget(widgetId, { 
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false 
      });
    }
  };

  const handleUnsubscribe = () => {
    if (!isInstrumentSelected) return;

    const subscriberId = `${dashboardId}-${widgetId}`;
    unsubscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
    updateWidget(widgetId, { isSubscribed: false });
    console.log(`📊 [TradesWidget] Unsubscribed from ${exchange}:${market}:${symbol}`);
  };

  // Auto-subscribe when widget mounts or provider becomes available
  useEffect(() => {
    if (activeProviderId && !widgetState.isSubscribed && isDataLoaded && isInstrumentSelected) {
      console.log(`📊 [TradesWidget] Auto-subscribing to ${exchange}:${market}:${symbol}`);
      handleSubscribe();
    }
  }, [activeProviderId, isDataLoaded, isInstrumentSelected]);

  // Proper subscription management when settings change
  useEffect(() => {
    if (widgetState.isSubscribed) {
      // Check if settings changed
      const prev = previousSubscriptionRef.current;
      const settingsChanged = prev && (
        prev.exchange !== exchange ||
        prev.symbol !== symbol ||
        prev.market !== market ||
        prev.isAggregated !== widgetState.isAggregatedTrades ||
        prev.tradesLimit !== widgetState.tradesLimit
      );

      if (settingsChanged) {
        console.log(`🔄 [TradesWidget] Settings changed, resubscribing...`);
        
        // Unsubscribe from PREVIOUS settings
        const subscriberId = `${dashboardId}-${widgetId}`;
        unsubscribe(subscriberId, prev.exchange, prev.symbol, 'trades', undefined, prev.market);
        
        // Subscribe to NEW settings (saving will happen in handleSubscribe)
        setTimeout(() => {
          handleSubscribe();
        }, 100);
      }
    }
  }, [exchange, symbol, market, widgetState.isAggregatedTrades, widgetState.tradesLimit, widgetState.isSubscribed]);

  // Cleanup on component unmount - КРИТИЧЕСКИ ВАЖНО для предотвращения утечек WebSocket соединений
  useEffect(() => {
    return () => {
      const subscriberId = `${dashboardId}-${widgetId}`;
      
      // Очистка подписки по текущим настройкам
      console.log(`🧹 [TradesWidget] Cleanup: unsubscribing from current settings ${exchange}:${market}:${symbol} (aggregated: ${widgetState.isAggregatedTrades})`);
      unsubscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
      
      // Дополнительная очистка по предыдущим настройкам (если отличаются)
      if (previousSubscriptionRef.current) {
        const prev = previousSubscriptionRef.current;
        if (prev.exchange !== exchange || prev.symbol !== symbol || 
            prev.market !== market || prev.isAggregated !== widgetState.isAggregatedTrades) {
          console.log(`🧹 [TradesWidget] Cleanup: also unsubscribing from previous settings ${prev.exchange}:${prev.market}:${prev.symbol} (aggregated: ${prev.isAggregated})`);
          unsubscribe(subscriberId, prev.exchange, prev.symbol, 'trades', undefined, prev.market);
        }
      }
      
      // Очистка widget state при размонтировании
      updateWidget(widgetId, { 
        isSubscribed: false,
        isLoading: false,
        error: null
      });
    };
  }, [dashboardId, widgetId, exchange, symbol, market, widgetState.isAggregatedTrades, unsubscribe, updateWidget]);

  // Apply filters and sorting
  const processedTrades = useMemo(() => {
    let filtered = [...rawTrades];

    // Filter by trade side
    if (filters.side !== 'all') {
      filtered = filtered.filter(trade => trade.side === filters.side);
    }

    // Filter by price
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(trade => trade.price >= minPrice);
      }
    }
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(trade => trade.price <= maxPrice);
      }
    }

    // Filter by volume
    if (filters.minAmount) {
      const minAmount = parseFloat(filters.minAmount);
      if (!isNaN(minAmount)) {
        filtered = filtered.filter(trade => trade.amount >= minAmount);
      }
    }
    if (filters.maxAmount) {
      const maxAmount = parseFloat(filters.maxAmount);
      if (!isNaN(maxAmount)) {
        filtered = filtered.filter(trade => trade.amount <= maxAmount);
      }
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    // Merge consecutive prints at one price and side. Exchanges split a single
    // aggressive order into one print per resting order it consumed, so a 40-BTC
    // sweep can arrive as thirty rows — merging restores the order the trader
    // actually sent, which is what the tape is being read for.
    if (widgetState.mergeSamePrice && filtered.length > 1) {
      const merged: Trade[] = [];
      for (const trade of filtered) {
        const prev = merged[merged.length - 1];
        if (prev && prev.price === trade.price && prev.side === trade.side) {
          merged[merged.length - 1] = {
            ...prev,
            amount: prev.amount + trade.amount,
            // Keep the newest timestamp so the row stays where the eye expects.
            timestamp: Math.max(prev.timestamp, trade.timestamp),
          };
        } else {
          merged.push({ ...trade });
        }
      }
      filtered = merged;
    }

    // Limit the number of displayed trades
    const limit = widgetState.tradesLimit;
    if (limit > 0) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [rawTrades, filters, sortBy, sortOrder, widgetState.tradesLimit, widgetState.mergeSamePrice]);

  // Blip on a large print. Tracks the newest trade seen rather than the list
  // contents, so re-renders (scrolling, settings changes) stay silent and only a
  // genuinely new print can make a sound.
  const lastSoundedRef = useRef<number>(0);
  useEffect(() => {
    if (!widgetState.soundOnLarge || !widgetState.largeTradeValue) return;
    const newest = processedTrades[0];
    if (!newest || newest.timestamp <= lastSoundedRef.current) return;
    lastSoundedRef.current = newest.timestamp;
    if (newest.price * newest.amount < widgetState.largeTradeValue) return;

    try {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      const ctx = new AudioCtor();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      // Buys ring higher than sells — side is audible without looking.
      osc.frequency.value = newest.side === 'buy' ? 880 : 440;
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => void ctx.close();
    } catch {
      // Autoplay policy or no audio device — a missing blip is not worth an error.
    }
  }, [processedTrades, widgetState.soundOnLarge, widgetState.largeTradeValue]);

  // Statistics for filtered data
  const stats = useMemo(() => {
    if (processedTrades.length === 0) {
      return { totalAmount: 0, totalVolume: 0, avgPrice: 0, buyCount: 0, sellCount: 0 };
    }

    const totalAmount = processedTrades.reduce((sum, trade) => sum + trade.amount, 0);
    const totalVolume = processedTrades.reduce((sum, trade) => sum + (trade.price * trade.amount), 0);
    const avgPrice = totalVolume / totalAmount;
    const buyCount = processedTrades.filter(trade => trade.side === 'buy').length;
    const sellCount = processedTrades.filter(trade => trade.side === 'sell').length;

    return { totalAmount, totalVolume, avgPrice, buyCount, sellCount };
  }, [processedTrades]);

  const formatPrice = (price: number): string => {
    return price.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  };

  // Если инструмент не выбран, показываем сообщение
  if (!isInstrumentSelected) {
    return (
      <div className="w-full h-full flex items-center justify-center text-center text-terminal-muted">
        <div>
          <div className="text-lg font-medium mb-2">No instrument selected</div>
          <div className="text-sm">Please select a trading instrument in the selector</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">


      {/* Error display */}
      {widgetState.error && (
        <div className="text-red-500 bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          {widgetState.error}
        </div>
      )}

      {/* Таблица трейдов */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <VirtualizedTradesList
          trades={processedTrades}
          currentSubscription={currentSubscription}
          showTableHeader={widgetState.showTableHeader}
          largeTradeValue={widgetState.highlightLarge ? widgetState.largeTradeValue : 0}
        />
      </div>

      {/* Footer Statistics */}
      {widgetState.showStats && processedTrades.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-xs flex-shrink-0 mt-2 border-t border-gray-200 dark:border-white/10 pt-2">
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <Hash className="h-3 w-3" />
              <span>Volume:</span>
            </div>
            <div className="font-mono text-gray-900 dark:text-gray-100">{formatAmount(stats.totalAmount)}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <DollarSign className="h-3 w-3" />
              <span>Total:</span>
            </div>
            <div className="font-mono text-gray-900 dark:text-gray-100">{formatVolume(stats.totalVolume)}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <TrendingUp className="h-3 w-3" />
              <span>Buys:</span>
            </div>
            <div className="font-mono text-gray-900 dark:text-gray-100">{stats.buyCount}</div>
          </div>
          <div className="bg-terminal-widget p-2 rounded border border-terminal-border">
            <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <TrendingDown className="h-3 w-3" />
              <span>Sells:</span>
            </div>
            <div className="font-mono text-gray-900 dark:text-gray-100">{stats.sellCount}</div>
          </div>
        </div>
      )}
    </div>
  );
};

// New virtualized trades list component
const VirtualizedTradesList: React.FC<{
  trades: Trade[];
  currentSubscription: any;
  showTableHeader: boolean;
  /** Quote value at or above which a row is emphasized; 0 disables it. */
  largeTradeValue?: number;
}> = ({ trades, currentSubscription, showTableHeader, largeTradeValue = 0 }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: trades.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20, // Ultra compact rows
    overscan: 5, // Render 5 extra items outside visible area
    measureElement: undefined, // Force recalculation
  });

  const formatPrice = (price: number): string => {
    return price.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatAmount = (amount: number): string => {
    return amount.toFixed(8).replace(/\.?0+$/, '');
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
    if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
    return volume.toFixed(2);
  };

  const formatNumberWithSpaces = (value: number): string => {
    return value
      .toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (trades.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-600 dark:text-gray-400">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">No trades available</div>
          <div className="text-sm">
            {currentSubscription?.isActive 
              ? 'Waiting for trade data...' 
              : 'No active subscription'
            }
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {showTableHeader && (
        <div className="grid grid-cols-4 text-xs font-medium text-gray-700 dark:text-gray-300 select-none py-1 px-2 border-b border-gray-200/50 dark:border-white/10 flex-shrink-0">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>Time</span>
          </div>
          <div className="text-right">Price</div>
          <div className="text-right">Size</div>
          <div className="text-right">Total</div>
        </div>
      )}
      <div
        ref={parentRef}
        className="overflow-auto flex-1"
        style={{ minHeight: 0 }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const trade = trades[virtualRow.index];
            const isBuy = trade.side === 'buy';
            const isSell = trade.side === 'sell';
            // Large prints get a stronger tint, scaled by how far past the
            // threshold they are, so a 10× print still stands out from a 1× one.
            const value = trade.price * trade.amount;
            const isLarge = largeTradeValue > 0 && value >= largeTradeValue;
            const overshoot = isLarge ? Math.min(1, value / (largeTradeValue * 5)) : 0;
            const alpha = isLarge ? 0.28 + 0.45 * overshoot : 0.1;
            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '20px !important',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <div
                  className={`grid grid-cols-4 text-xs font-mono px-2 hover:bg-gray-50 dark:hover:bg-white/5 ${isLarge ? 'font-semibold' : ''}`}
                  style={{
                    height: '20px !important',
                    lineHeight: '20px !important',
                    minHeight: '20px !important',
                    maxHeight: '20px !important',
                    backgroundColor: isBuy ? `hsla(134, 61%, 41%, ${alpha})` : isSell ? `hsla(0, 84%, 60%, ${alpha})` : 'transparent',
                    boxShadow: isLarge ? `inset 2px 0 0 ${isBuy ? 'hsl(134, 61%, 55%)' : 'hsl(0, 84%, 65%)'}` : undefined,
                  }}
                >
                  <div className="text-gray-600 dark:text-gray-400 flex items-center">
                    {formatTime(trade.timestamp)}
                  </div>
                  <div 
                    className={`text-right flex items-center justify-end ${
                      isBuy ? 'text-green-600 dark:text-green-400' : 
                      isSell ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {formatNumberWithSpaces(trade.price)}
                  </div>
                  <div className="text-right text-gray-900 dark:text-gray-100 flex items-center justify-end">
                    {formatNumberWithSpaces(trade.amount)}
                  </div>
                  <div 
                    className={`text-right flex items-center justify-end ${
                      isBuy ? 'text-green-600 dark:text-green-400' : 
                      isSell ? 'text-red-600 dark:text-red-400' : 
                      'text-gray-700 dark:text-gray-300'
                    }`}
                  > 
                    {formatNumberWithSpaces(trade.price * trade.amount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const TradesWidgetV2: React.FC<TradesWidgetV2Props> = (props) => {
  return (
    <ErrorBoundary>
      <TradesWidgetV2Inner {...props} />
    </ErrorBoundary>
  );
}; 