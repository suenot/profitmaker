import React, { useMemo } from 'react';
import ChartSettings from './ChartSettings';
import { useChartWidgetsStore } from '@/store/chartWidgetStore';
import { useDataProviderStore } from '@/store/dataProviderStore';
import { useGroupStore } from '@/store/groupStore';
import { Timeframe, MarketType } from '@/types/dataProviders';

interface ChartSettingsWrapperProps {
  widgetId: string;
  selectedGroupId?: string;
}

const ChartSettingsWrapper: React.FC<ChartSettingsWrapperProps> = ({ widgetId, selectedGroupId }) => {
  const { getWidget, updateWidget } = useChartWidgetsStore();
  const { 
    subscribe, 
    unsubscribe, 
    dataFetchSettings,
    getActiveSubscriptionsList 
  } = useDataProviderStore();
  
  // Group store integration - единый источник данных о выбранном инструменте
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  // Fallback to transparent group if no group is selected
  const selectedGroup = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();

  // Проверка полноты выбранного инструмента
  const isInstrumentSelected = selectedGroup && 
    selectedGroup.exchange && 
    selectedGroup.market && 
    selectedGroup.tradingPair;

  // Получаем данные инструмента из selectedGroup
  const exchange = selectedGroup?.exchange || '';
  const symbol = selectedGroup?.tradingPair || '';
  const market = (selectedGroup?.market as MarketType) || 'spot';
  
  const widget = getWidget(widgetId);
  const timeframe = widget.timeframe;
  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Check if we have active subscription for current instrument settings
  const currentSubscription = useMemo(() => {
    if (!isInstrumentSelected) return undefined;
    
    return activeSubscriptions.find(sub => 
      sub.key.exchange === exchange && 
      sub.key.symbol === symbol && 
      sub.key.dataType === 'candles' &&
      sub.key.timeframe === timeframe &&
      sub.key.market === market
    );
  }, [activeSubscriptions, isInstrumentSelected, exchange, symbol, timeframe, market]);

  const getConnectionStatus = () => {
    if (!currentSubscription) return 'disconnected';
    if (!currentSubscription.isActive) return 'connecting';
    return 'connected';
  };

  // Определяем isSubscribed на основе currentSubscription для синхронизации
  const isSubscribedFromSubscription = currentSubscription ? currentSubscription.isActive : false;

  // Handler for timeframe change (only editable setting)
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    // Остановить текущую подписку если есть
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      unsubscribe(
        subscriberId, 
        exchange, 
        symbol, 
        'candles', 
        timeframe, 
        market
      );
    }

    // Обновить только timeframe в widget store
    updateWidget(widgetId, { timeframe: newTimeframe });

    // Если была активная подписка, перезапустить с новым timeframe
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      setTimeout(async () => {
        try {
          updateWidget(widgetId, { isLoading: true, error: null });
          
          const result = await subscribe(
            subscriberId, 
            exchange, 
            symbol, 
            'candles', 
            newTimeframe, 
            market
          );
          
          if (result.success) {
            updateWidget(widgetId, { 
              isSubscribed: true, 
              isLoading: false 
            });
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
      }, 100);
    }
  };

  // Handlers для изменения настроек через groupStore
  const handleExchangeChange = (newExchange: string) => {
    if (!selectedGroup) return;

    // Остановить текущую подписку если есть
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      unsubscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
    }

    // Обновить exchange в groupStore - это автоматически синхронизирует все компоненты
    const { updateGroup } = useGroupStore.getState();
    updateGroup(selectedGroup.id, {
      ...selectedGroup,
      exchange: newExchange
    });

    console.log(`🔄 Chart settings: Exchange changed to ${newExchange} in groupStore`);
  };

  const handleSymbolChange = (newSymbol: string) => {
    if (!selectedGroup) return;

    // Остановить текущую подписку если есть
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      unsubscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
    }

    // Обновить tradingPair в groupStore
    const { updateGroup } = useGroupStore.getState();
    updateGroup(selectedGroup.id, {
      ...selectedGroup,
      tradingPair: newSymbol
    });

    console.log(`🔄 Chart settings: Symbol changed to ${newSymbol} in groupStore`);
  };

  const handleMarketChange = (newMarket: MarketType) => {
    if (!selectedGroup) return;

    // Остановить текущую подписку если есть
    if (currentSubscription) {
      const subscriberId = `widget-${widgetId}`;
      unsubscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
    }

    // Обновить market в groupStore
    const { updateGroup } = useGroupStore.getState();
    updateGroup(selectedGroup.id, {
      ...selectedGroup,
      market: newMarket
    });

    console.log(`🔄 Chart settings: Market changed to ${newMarket} in groupStore`);
  };

  const handleSubscribe = async () => {
    if (!isInstrumentSelected) {
      updateWidget(widgetId, { error: 'No instrument selected' });
      return;
    }

    try {
      updateWidget(widgetId, { isLoading: true, error: null });
      
      const subscriberId = `widget-${widgetId}`;
      const result = await subscribe(
        subscriberId, 
        exchange, 
        symbol, 
        'candles', 
        timeframe, 
        market
      );
      
      if (result.success) {
        updateWidget(widgetId, { 
          isSubscribed: true, 
          isLoading: false 
        });
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

    const subscriberId = `widget-${widgetId}`;
    unsubscribe(
      subscriberId, 
      exchange, 
      symbol, 
      'candles', 
      timeframe, 
      market
    );
    updateWidget(widgetId, { isSubscribed: false });
  };

  // Если инструмент не выбран, показываем сообщение
  if (!isInstrumentSelected) {
    return (
      <div className="p-4 text-center text-terminal-muted">
        <div className="text-lg font-medium mb-2">No instrument selected</div>
        <div className="text-sm">Please select a trading instrument in the selector</div>
      </div>
    );
  }

  return (
    <ChartSettings
      exchange={exchange}
      symbol={symbol}
      timeframe={timeframe}
      market={market}
      isSubscribed={isSubscribedFromSubscription}
      isLoading={widget.isLoading}
      error={widget.error}
      dataFetchMethod={dataFetchSettings.method}
      connectionStatus={getConnectionStatus()}
      onExchangeChange={handleExchangeChange}
      onSymbolChange={handleSymbolChange}
      onTimeframeChange={handleTimeframeChange}
      onMarketChange={handleMarketChange}
      onSubscribe={handleSubscribe}
      onUnsubscribe={handleUnsubscribe}
      isReadOnly={false} // Поля редактируются и обновляют groupStore
    />
  );
};

export default ChartSettingsWrapper;
