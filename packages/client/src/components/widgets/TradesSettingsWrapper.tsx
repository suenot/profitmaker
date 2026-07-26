import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { Filter, ArrowUp, ArrowDown, Settings2, Play, Pause, RefreshCw } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useTradesWidgetsStore } from '../../store/tradesWidgetStore';
import { useGroupStore } from '../../store/groupStore';
import { MarketType } from '../../types/dataProviders';

interface TradesSettingsWrapperProps {
  widgetId: string;
  isSubscribed?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onSubscribe?: () => void;
  onUnsubscribe?: () => void;
}

const TradesSettingsWrapper: React.FC<TradesSettingsWrapperProps> = ({ 
  widgetId,
  isSubscribed = false,
  isLoading = false,
  error = null,
  onSubscribe,
  onUnsubscribe
}) => {
  const { 
    subscribe, 
    unsubscribe, 
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  // Widget store integration
  const { getWidget, updateWidget } = useTradesWidgetsStore();
  const widgetState = getWidget(widgetId);

  // Group store integration - берем данные из выбранной группы
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const selectedGroup = globalSelectedGroupId ? getGroupById(globalSelectedGroupId) : getTransparentGroup();

  // Получаем данные инструмента из selectedGroup
  const exchange = selectedGroup?.exchange || 'binance';
  const symbol = selectedGroup?.tradingPair || 'BTC/USDT';
  const market = (selectedGroup?.market as MarketType) || 'spot';

  // Filters state
  const [filters, setFilters] = useState({
    side: 'all', // 'all', 'buy', 'sell'
    minPrice: '',
    maxPrice: '',
    minAmount: '',
    maxAmount: '',
    showLastN: '100'
  });

  // Sorting state
  const [sortBy, setSortBy] = useState<'timestamp' | 'price' | 'amount'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Display state
  const [autoScroll, setAutoScroll] = useState(true);

  // Get current subscription info
  const activeSubscriptions = getActiveSubscriptionsList();
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'trades' &&
    sub.key.market === market
  );

  // Subscription handlers
  const handleSubscribe = async () => {
    if (!activeProviderId) {
      updateWidget(widgetId, { error: 'No active provider' });
      return;
    }

    try {
      updateWidget(widgetId, { isLoading: true, error: null });
      
      const subscriberId = `settings-${widgetId}`;
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
        console.log(`📊 [TradesSettings] Subscribed to ${exchange}:${market}:${symbol} (aggregated: ${widgetState.isAggregatedTrades}, limit: ${widgetState.tradesLimit})`);
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
    const subscriberId = `settings-${widgetId}`;
    unsubscribe(subscriberId, exchange, symbol, 'trades', undefined, market);
    updateWidget(widgetId, { isSubscribed: false });
    console.log(`📊 [TradesSettings] Unsubscribed from ${exchange}:${market}:${symbol}`);
  };

  // Use widget state for subscription status instead of props
  const isSubscribedFromWidget = widgetState.isSubscribed || isSubscribed;
  const isLoadingFromWidget = widgetState.isLoading || isLoading;
  const errorFromWidget = widgetState.error || error;

  return (
    <div className="space-y-6">
      {/* Trades Configuration */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4" />
            <Label className="text-sm font-medium text-terminal-text">Trades Configuration</Label>
          </div>
          <p className="text-xs text-terminal-muted mb-3">Configure trades data aggregation and limits</p>
        </div>
        
        <div className="space-y-3">
          {/* Aggregate Trades Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Aggregate Trades</Label>
              <p className="text-xs text-terminal-muted/70">Combine multiple trades into one for better performance</p>
            </div>
            <Switch
              checked={widgetState.isAggregatedTrades}
              onCheckedChange={(checked) => updateWidget(widgetId, { isAggregatedTrades: checked })}
            />
          </div>

          {/* Show Table Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Show Table Header</Label>
            </div>
            <Switch
              checked={widgetState.showTableHeader}
              onCheckedChange={(checked) => updateWidget(widgetId, { showTableHeader: checked })}
            />
          </div>

          {/* Show Statistics */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Show Statistics</Label>
            </div>
            <Switch
              checked={widgetState.showStats}
              onCheckedChange={(checked) => updateWidget(widgetId, { showStats: checked })}
            />
          </div>

          {/* Large prints — highlight / sound / threshold */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Highlight Large Trades</Label>
              <p className="text-xs text-terminal-muted/70">Emphasize prints at or above the threshold below</p>
            </div>
            <Switch
              checked={widgetState.highlightLarge}
              onCheckedChange={(checked) => updateWidget(widgetId, { highlightLarge: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-terminal-muted">Large Trade Threshold (quote value)</Label>
            <Input
              value={String(widgetState.largeTradeValue)}
              inputMode="numeric"
              onChange={(e) => {
                const value = Number(e.target.value.replace(/[^0-9.]/g, ''));
                updateWidget(widgetId, { largeTradeValue: Number.isFinite(value) ? value : 0 });
              }}
            />
            <p className="text-xs text-terminal-muted/70">
              price × amount, so the same number means the same money on every instrument
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Sound on Large Trades</Label>
              <p className="text-xs text-terminal-muted/70">Short blip; needs the highlight threshold above</p>
            </div>
            <Switch
              checked={widgetState.soundOnLarge}
              onCheckedChange={(checked) => updateWidget(widgetId, { soundOnLarge: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs text-terminal-muted">Merge Same Price</Label>
              <p className="text-xs text-terminal-muted/70">Collapse consecutive prints at one price and side into a single row</p>
            </div>
            <Switch
              checked={widgetState.mergeSamePrice}
              onCheckedChange={(checked) => updateWidget(widgetId, { mergeSamePrice: checked })}
            />
          </div>

          {/* Trades Limit */}
          <div className="space-y-2">
            <Label className="text-xs text-terminal-muted">Trades Limit</Label>
            <Select 
              value={widgetState.tradesLimit.toString()} 
              onValueChange={(value) => updateWidget(widgetId, { tradesLimit: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 trades</SelectItem>
                <SelectItem value="200">200 trades</SelectItem>
                <SelectItem value="500">500 trades</SelectItem>
                <SelectItem value="1000">1000 trades</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Current Instrument Display */}
          <div className="p-3 rounded border bg-terminal-widget border-terminal-border space-y-2">
            <div className="text-xs text-terminal-muted">Current Instrument:</div>
            <div className="text-sm text-terminal-text">
              <strong>{exchange}</strong> • <strong>{symbol}</strong> • <strong>{market}</strong>
            </div>
            
            {/* Subscription Status */}
            {currentSubscription && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs">
                    📡 Method: <strong>
                      {currentSubscription.method === 'websocket' 
                        ? 'WebSocket' 
                        : currentSubscription.isFallback 
                          ? 'REST (fallback)'
                          : 'REST'
                      }
                    </strong>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${currentSubscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                </div>
                
                {currentSubscription.isFallback && (
                  <div className="text-orange-600 bg-orange-100 p-2 rounded text-xs">
                    ⚠️ WebSocket unavailable, using REST fallback
                  </div>
                )}
                
                <div className="text-xs">👥 Subscribers: <strong>{currentSubscription.subscriberCount}</strong></div>
                {currentSubscription.lastUpdate > 0 && (
                  <div className="text-xs">🕐 Last update: <strong>{new Date(currentSubscription.lastUpdate).toLocaleTimeString()}</strong></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Data Connection */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Data Connection</Label>
          <p className="text-xs text-terminal-muted">Control real-time data subscription</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {currentSubscription && (
              <Badge variant="outline" className="text-xs">
                Method: {currentSubscription.method === 'websocket' 
                  ? 'WebSocket' 
                  : currentSubscription.isFallback 
                    ? 'REST (fallback)'
                    : 'REST'
                }
              </Badge>
            )}
            
            <Button
              onClick={isSubscribedFromWidget ? handleUnsubscribe : handleSubscribe}
              disabled={isLoadingFromWidget}
              size="sm"
              variant={isSubscribedFromWidget ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isLoadingFromWidget ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : isSubscribedFromWidget ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isLoadingFromWidget ? 'Loading...' : isSubscribedFromWidget ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
          
          {errorFromWidget && (
            <div className="text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {errorFromWidget}
            </div>
          )}
          
          <div className="text-xs text-terminal-muted">
            <p>• WebSocket provides real-time updates</p>
            <p>• REST polling updates at intervals</p>
            <p>• Trades data is cached for performance</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4" />
            <Label className="text-sm font-medium text-terminal-text">Filters</Label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Side</Label>
              <Select value={filters.side} onValueChange={(value) => setFilters(prev => ({ ...prev, side: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All trades</SelectItem>
                  <SelectItem value="buy">Buy only</SelectItem>
                  <SelectItem value="sell">Sell only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Show last</Label>
              <Input
                type="number"
                value={filters.showLastN}
                onChange={(e) => setFilters(prev => ({ ...prev, showLastN: e.target.value }))}
                placeholder="100"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Min. price</Label>
              <Input
                type="number"
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Max. price</Label>
              <Input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: e.target.value }))}
                placeholder="No limit"
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-terminal-muted">Min. volume</Label>
              <Input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs text-terminal-muted">Max. volume</Label>
              <Input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                placeholder="No limit"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Sorting */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Sorting</Label>
          <p className="text-xs text-terminal-muted">Configure how trades are sorted</p>
        </div>
        
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-terminal-muted">Sort by</Label>
            <div className="flex items-center gap-2 mt-1">
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Time</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                  <SelectItem value="amount">Volume</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Options */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Display Options</Label>
          <p className="text-xs text-terminal-muted">Configure how trades are displayed</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="auto-scroll" className="text-sm text-terminal-text">Auto-scroll to new trades</Label>
            <p className="text-xs text-terminal-muted">Automatically scroll to show latest trades</p>
          </div>
          <Switch
            id="auto-scroll"
            checked={autoScroll}
            onCheckedChange={setAutoScroll}
          />
        </div>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button variant="outline" className="w-full" onClick={() => {
          setFilters({
            side: 'all',
            minPrice: '',
            maxPrice: '',
            minAmount: '',
            maxAmount: '',
            showLastN: '100'
          });
          setSortBy('timestamp');
          setSortOrder('desc');
          setAutoScroll(true);
        }}>
          Reset to Default
        </Button>
      </div>
    </div>
  );
};

export default TradesSettingsWrapper; 