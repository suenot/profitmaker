import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { BookOpen, TrendingUp, TrendingDown, BarChart, Play, Pause, RefreshCw } from 'lucide-react';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useOrderBookWidgetsStore } from '../../store/orderBookWidgetStore';
import { useGroupStore } from '../../store/groupStore';
import { MarketType } from '../../types/dataProviders';

interface OrderBookSettingsWrapperProps {
  widgetId: string;
  selectedGroupId?: string;
}

const OrderBookSettingsWrapper: React.FC<OrderBookSettingsWrapperProps> = ({ widgetId, selectedGroupId }) => {
  const { 
    subscribe, 
    unsubscribe, 
    initializeOrderBookData,
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList
  } = useDataProviderStore();

  const { getWidget, updateWidget, setWidgetSettings } = useOrderBookWidgetsStore();
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  
  const widget = getWidget(widgetId);

  // Get instrument data from selectedGroup (like Chart and Trades widgets)
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

  // Get current subscription info
  const activeSubscriptions = getActiveSubscriptionsList();
  const currentSubscription = useMemo(() => {
    return activeSubscriptions.find(sub => 
      sub.key.exchange === exchange && 
      sub.key.symbol === symbol && 
      sub.key.dataType === 'orderbook' &&
      sub.key.market === market
    );
  }, [activeSubscriptions, exchange, symbol, market]);

  // Subscription handlers
  const handleSubscribe = async () => {
    if (!activeProviderId) {
      updateWidget(widgetId, { error: 'No active provider' });
      return;
    }

    try {
      updateWidget(widgetId, { isLoading: true, error: null });
      
      // Initialize with REST data first
      console.log(`🚀 [OrderBook-${widgetId}] Initializing orderbook data via REST`);
      const initialOrderBook = await initializeOrderBookData(exchange, symbol, market);
      
      // Start WebSocket subscription
      const subscriberId = `${widgetId}-settings`;
      const subscriptionResult = await subscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
      
      if (subscriptionResult.success) {
        updateWidget(widgetId, { 
          isSubscribed: true, 
          isLoading: false, 
          error: null 
        });
        console.log(`✅ [OrderBook-${widgetId}] Subscription successful`);
      } else {
        updateWidget(widgetId, { 
          isSubscribed: false, 
          isLoading: false, 
          error: subscriptionResult.error || 'Subscription failed' 
        });
      }
    } catch (error) {
      console.error('❌ Error in orderbook subscription:', error);
      updateWidget(widgetId, { 
        error: error instanceof Error ? error.message : 'Subscription failed',
        isLoading: false,
        isSubscribed: false
      });
    }
  };

  const handleUnsubscribe = () => {
    const subscriberId = `${widgetId}-settings`;
    unsubscribe(subscriberId, exchange, symbol, 'orderbook', undefined, market);
    updateWidget(widgetId, { isSubscribed: false });
    console.log(`🛑 [OrderBook-${widgetId}] Unsubscribed`);
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6 text-terminal-text">
      {/* Data Connection */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Data Connection</Label>
          <p className="text-xs text-terminal-muted">Control real-time orderbook data subscription</p>
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
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={isLoading || !activeProviderId}
              size="sm"
              variant={isSubscribed ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : isSubscribed ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
              {isLoading ? 'Loading...' : isSubscribed ? 'Disconnect' : 'Connect'}
            </Button>
          </div>
          
          {error && (
            <div className="text-red-400 text-sm bg-red-50 dark:bg-red-950/20 p-2 rounded">
              {error}
            </div>
          )}

          {/* Connection Status */}
          {isSubscribed && currentSubscription && (
            <div className={`text-xs p-2 rounded space-y-1 ${
              currentSubscription.isFallback 
                ? 'text-orange-700 bg-orange-50 border border-orange-200' 
                : 'text-gray-500 bg-blue-50'
            }`}>
              <div className="flex items-center justify-between">
                <span>
                  📡 Method: <strong>
                    {currentSubscription.method === 'websocket' 
                      ? 'WebSocket (real-time)' 
                      : currentSubscription.isFallback 
                        ? '🔄 REST (fallback from WebSocket)'
                        : 'REST (interval)'
                    }
                  </strong>
                </span>
                <span className={`w-2 h-2 rounded-full ${currentSubscription.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </div>
              
              {currentSubscription.isFallback && (
                <div className="text-orange-600 bg-orange-100 p-1 rounded text-xs">
                  ⚠️ WebSocket unavailable for this exchange/pair, using REST as fallback
                </div>
              )}
              
              {currentSubscription.method === 'rest' && (
                <div>⏱️ Update interval: <strong>{dataFetchSettings.restIntervals.orderbook}ms</strong></div>
              )}
              <div>👥 Subscribers: <strong>{currentSubscription.subscriberCount}</strong></div>
              {currentSubscription.lastUpdate > 0 && (
                <div>🕐 Last update: <strong>{formatTime(currentSubscription.lastUpdate)}</strong></div>
              )}

              {/* Display used CCXT method */}
              {currentSubscription.ccxtMethod && (
                <div className="text-xs bg-blue-100 p-1 rounded">
                  🔧 CCXT method: <strong>{currentSubscription.ccxtMethod}</strong>
                  {currentSubscription.ccxtMethod === 'watchOrderBookForSymbols' && ' (⚡ diff updates)'}
                  {currentSubscription.ccxtMethod === 'watchOrderBook' && ' (📋 full snapshots)'}
                  {currentSubscription.ccxtMethod === 'fetchOrderBook' && ' (🔄 REST requests)'}
                </div>
              )}
            </div>
          )}
          
          {isSubscribed && !currentSubscription && (
            <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
              ⚠️ Subscription is being created... Please wait for connection.
            </div>
          )}

          {/* Instrument Info */}
          <div className="text-xs text-terminal-muted bg-terminal-widget/50 p-2 rounded">
            <div><strong>Exchange:</strong> {exchange}</div>
            <div><strong>Symbol:</strong> {symbol}</div>
            <div><strong>Market:</strong> {market}</div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Display Settings */}
      <div className="space-y-4">
        <div>
          <Label className="text-sm font-medium text-terminal-text">Display Settings</Label>
          <p className="text-xs text-terminal-muted">Configure how order book is displayed</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-terminal-text">Depth</Label>
            <Select value={displayDepth.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              displayDepth: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 levels</SelectItem>
                <SelectItem value="10">10 levels</SelectItem>
                <SelectItem value="20">20 levels</SelectItem>
                <SelectItem value="50">50 levels</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-terminal-text">Minimum price decimals</Label>
            <Select value={priceDecimals.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              priceDecimals: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-terminal-text">Volume decimals</Label>
            <Select value={amountDecimals.toString()} onValueChange={(value) => setWidgetSettings(widgetId, { 
              ...widget, 
              amountDecimals: parseInt(value) 
            })}>
              <SelectTrigger className="bg-terminal-widget border-terminal-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">0</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 pt-4">
            <Switch
              id="show-cumulative"
              checked={showCumulative}
              onCheckedChange={(checked) => setWidgetSettings(widgetId, { 
                ...widget, 
                showCumulative: checked 
              })}
            />
            <Label htmlFor="show-cumulative" className="text-xs text-terminal-text">Cumulative volume</Label>
          </div>
        </div>
      </div>

      <Separator />

      {/* Reset Settings */}
      <div className="space-y-3">
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={() => {
            setWidgetSettings(widgetId, {
              exchange: 'binance',
              symbol: 'BTC/USDT',
              market: 'spot',
              displayDepth: 10,
              showCumulative: true,
              priceDecimals: 2,
              amountDecimals: 4
            });
          }}
        >
          Reset to Default
        </Button>
      </div>

      {!isSubscribed && (
        <div className="text-xs text-terminal-muted text-center pt-2 border-t border-terminal-border">
          💡 Widget automatically deduplicates subscriptions - if multiple widgets request the same data, only one connection is created.
        </div>
      )}
    </div>
  );
};

export default OrderBookSettingsWrapper;
