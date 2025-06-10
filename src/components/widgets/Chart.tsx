import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { NightVision } from 'night-vision';
import { useTheme } from '../../hooks/useTheme';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { Timeframe, MarketType, ChartUpdateEvent, Candle, DataProvider } from '../../types/dataProviders';
import TimeframeSelect from '../ui/TimeframeSelect';
import { loadHistoricalCandles, shouldLoadMoreData, createHistoricalDataLoader } from '../../utils/historicalDataLoader';

// Theme-aware chart colors
const getChartColors = (theme: 'dark' | 'light') => {
  if (theme === 'light') {
    return {
      back: '#ffffff',        // Белый фон для светлой темы
      grid: '#e5e7eb',        // Светло-серая сетка  
      candleUp: '#16c784',    // Ярко-зеленый для роста
      candleDw: '#ea3943',    // Ярко-красный для падения
      wickUp: '#16c784',      // Ярко-зеленый фитиль
      wickDw: '#ea3943',      // Ярко-красный фитиль
      volUp: '#16c784',       // Зеленый объем
      volDw: '#ea3943',       // Красный объем
    };
  } else {
    return {
      back: '#000000',        // Черный фон для темной темы
      grid: '#1a1a1a',        // Темная сетка
      candleUp: '#26a69a',    // Зеленые свечи
      candleDw: '#ef5350',    // Красные свечи
      wickUp: '#26a69a',      // Зеленые фитили
      wickDw: '#ef5350',      // Красные фитили
      volUp: '#26a69a',       // Зеленый объем
      volDw: '#ef5350',       // Красный объем
    };
  }
};



interface ChartProps {
  dashboardId?: string;
  widgetId?: string;
  initialExchange?: string;
  initialSymbol?: string;
  initialTimeframe?: Timeframe;
  initialMarket?: MarketType;
}

const Chart: React.FC<ChartProps> = ({
  dashboardId = 'default',
  widgetId = 'chart-widget',
  initialExchange = 'binance',
  initialSymbol = 'BTC/USDT',
  initialTimeframe = '1h',
  initialMarket = 'spot'
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const nightVisionRef = useRef<any>(null);
  
  // Generate meaningful overlay name
  const generateOverlayName = (symbol: string, exchange: string, market: MarketType) => {
    const exchangeName = exchange.charAt(0).toUpperCase() + exchange.slice(1);
    const marketType = market === 'spot' ? 'Spot' : 'Futures';
    return `${symbol} (${exchangeName}:${marketType})`;
  };
  
  // Theme integration
  const { theme } = useTheme();
  const chartColors = useMemo(() => getChartColors(theme), [theme]);
  
  // Store integration
  const { 
    subscribe, 
    unsubscribe, 
    initializeChartData,
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList,
    addChartUpdateListener,
    removeChartUpdateListener
  } = useDataProviderStore();

  // Widget state
  const [exchange, setExchange] = useState(initialExchange);
  const [symbol, setSymbol] = useState(initialSymbol);
  const [timeframe, setTimeframe] = useState<Timeframe>(initialTimeframe);
  const [market, setMarket] = useState<MarketType>(initialMarket);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chart state
  const [chartDimensions, setChartDimensions] = useState({ width: 600, height: 400 });
  const [showVolume, setShowVolume] = useState(true);
  
  // Historical data loader state
  const [historicalLoader, setHistoricalLoader] = useState(() => 
    createHistoricalDataLoader(exchange, symbol, timeframe, market)
  );
  const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
  const oldestTimestampRef = useRef<number | null>(null); // Для актуального значения в callbacks
  const [isLoadingHistorical, setIsLoadingHistorical] = useState(false);
  const [loadingTimestamp, setLoadingTimestamp] = useState<number | null>(null); // Предотвращаем дублирование запросов

  // Historical data loading function
  const loadHistoricalData = useCallback(async (targetOldestTimestamp?: number) => {
    // Используем переданный параметр или актуальное значение из ref
    const effectiveOldestTimestamp = targetOldestTimestamp || oldestTimestampRef.current;
    
    console.log(`🚀 [Chart] loadHistoricalData called with params:`);
    console.log(`   targetOldestTimestamp: ${targetOldestTimestamp ? new Date(targetOldestTimestamp).toISOString() : 'undefined'}`);
    console.log(`   oldestTimestamp (state): ${oldestTimestamp ? new Date(oldestTimestamp).toISOString() : 'null'}`);
    console.log(`   oldestTimestampRef: ${oldestTimestampRef.current ? new Date(oldestTimestampRef.current).toISOString() : 'null'}`);
    console.log(`   effectiveOldestTimestamp: ${effectiveOldestTimestamp ? new Date(effectiveOldestTimestamp).toISOString() : 'null'}`);
    console.log(`   isLoadingHistorical: ${isLoadingHistorical}`);
    console.log(`   loadingTimestamp: ${loadingTimestamp ? new Date(loadingTimestamp).toISOString() : 'null'}`);
    console.log(`   nightVision available: ${!!nightVisionRef.current}`);
    
    if (!effectiveOldestTimestamp || isLoadingHistorical || !nightVisionRef.current) {
      console.log(`❌ [Chart] loadHistoricalData skipped: missing requirements`);
      return;
    }

    // Защита от дублирования - проверяем не загружаем ли мы уже этот timestamp
    if (loadingTimestamp === effectiveOldestTimestamp) {
      console.log(`⏸️ [Chart] loadHistoricalData skipped: already loading this timestamp ${new Date(effectiveOldestTimestamp).toISOString()}`);
      return;
    }

    setIsLoadingHistorical(true);
    setLoadingTimestamp(effectiveOldestTimestamp);
    console.log(`📜 [Chart] Loading historical data before ${new Date(effectiveOldestTimestamp).toISOString()}`);

    try {
      // Get active provider for the exchange  
      console.log(`🔍 [Chart] Getting provider: activeProviderId=${activeProviderId}, providers:`, Object.keys(providers));
      const activeProvider = providers[activeProviderId];
      if (!activeProvider) {
        throw new Error(`No active provider found for ID: ${activeProviderId}`);
      }
      console.log(`✅ [Chart] Found provider:`, activeProvider.name);
      
      console.log(`🔄 [Chart] Calling loadHistoricalCandles...`);
      const historicalCandles = await loadHistoricalCandles(
        exchange,
        symbol,
        timeframe,
        market,
        effectiveOldestTimestamp,
        activeProvider
      );
      console.log(`📊 [Chart] loadHistoricalCandles returned ${historicalCandles?.length || 0} candles`);

      if (historicalCandles.length > 0 && nightVisionRef.current) {
        // Convert to NightVision format
        const historicalOhlcvData = historicalCandles.map(candle => [
          candle.timestamp,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume
        ]);

        // Get current chart data - проверяем и hub.mainOv.data и panes структуру
        let updated = false;
        
        // Сначала пробуем обновить hub.mainOv.data (используется WebSocket)
        if (nightVisionRef.current.hub && nightVisionRef.current.hub.mainOv && nightVisionRef.current.hub.mainOv.data) {
          console.log(`📊 [Chart] Updating hub.mainOv.data (WebSocket структура)`);
          const currentOhlcvData = nightVisionRef.current.hub.mainOv.data;
          console.log(`📊 [Chart] Current data length: ${currentOhlcvData.length}, adding ${historicalOhlcvData.length} historical candles`);
          
          // Проверяем есть ли пересечения по времени, чтобы избежать дублирования
          const existingTimestamps = new Set(currentOhlcvData.map((candle: any[]) => candle[0]));
          const uniqueHistoricalData = historicalOhlcvData.filter(candle => !existingTimestamps.has(candle[0]));
          
          if (uniqueHistoricalData.length > 0) {
            // ИСПРАВЛЕНО: добавляем исторические данные в НАЧАЛО массива, не удаляя существующие
            nightVisionRef.current.hub.mainOv.data.splice(0, 0, ...uniqueHistoricalData);
            console.log(`📊 [Chart] Added ${uniqueHistoricalData.length} unique historical candles (filtered ${historicalOhlcvData.length - uniqueHistoricalData.length} duplicates)`);
            console.log(`📊 [Chart] Updated hub.mainOv.data length: ${nightVisionRef.current.hub.mainOv.data.length}`);
            updated = true;
          } else {
            console.log(`📊 [Chart] No new unique historical data to add`);
          }
        }
        
        // Также обновляем panes структуру (REST)
        const currentData = nightVisionRef.current.data;
        if (currentData && currentData.panes && currentData.panes[0] && currentData.panes[0].overlays[0]) {
          console.log(`📊 [Chart] Updating panes structure (REST структура)`);
          const currentOhlcvData = currentData.panes[0].overlays[0].data || [];
          console.log(`📊 [Chart] Panes current data length: ${currentOhlcvData.length}, adding ${historicalOhlcvData.length} historical candles`);
          
          // Проверяем есть ли пересечения по времени для panes структуры
          const existingTimestamps = new Set(currentOhlcvData.map((candle: any[]) => candle[0]));
          const uniqueHistoricalData = historicalOhlcvData.filter(candle => !existingTimestamps.has(candle[0]));
          
          if (uniqueHistoricalData.length > 0) {
            // ИСПРАВЛЕНО: добавляем исторические данные в НАЧАЛО массива
            const newOhlcvData = [...uniqueHistoricalData, ...currentOhlcvData];
            currentData.panes[0].overlays[0].data = newOhlcvData;

            // Update volume data if exists
            if (currentData.panes[1] && currentData.panes[1].overlays[0]) {
              const historicalVolumeData = historicalCandles
                .filter(candle => !existingTimestamps.has(candle.timestamp))
                .map(candle => [candle.timestamp, candle.volume]);
              const currentVolumeData = currentData.panes[1].overlays[0].data || [];
              const newVolumeData = [...historicalVolumeData, ...currentVolumeData];
              currentData.panes[1].overlays[0].data = newVolumeData;
            }

            // Update chart
            nightVisionRef.current.data = currentData;
            console.log(`📊 [Chart] Updated panes data length: ${newOhlcvData.length}`);
            updated = true;
          } else {
            console.log(`📊 [Chart] No new unique panes data to add`);
          }
        }

        if (updated) {
          nightVisionRef.current.update("data");

          // Update oldest timestamp в обоих местах - state и ref
          // ВАЖНО: Берем самый старый timestamp из загруженных данных
          const sortedHistoricalCandles = historicalCandles.sort((a, b) => a.timestamp - b.timestamp);
          const newOldestTimestamp = sortedHistoricalCandles[0].timestamp;
          
          console.log(`🔄 [Chart] Updating oldest timestamp:`);
          console.log(`   Previous: ${oldestTimestampRef.current ? new Date(oldestTimestampRef.current).toISOString() : 'null'}`);
          console.log(`   New: ${new Date(newOldestTimestamp).toISOString()}`);
          console.log(`   Historical candles range: ${new Date(sortedHistoricalCandles[0].timestamp).toISOString()} - ${new Date(sortedHistoricalCandles[sortedHistoricalCandles.length - 1].timestamp).toISOString()}`);
          
          // КРИТИЧНО: Сначала обновляем ref, затем state
          oldestTimestampRef.current = newOldestTimestamp;
          setOldestTimestamp(newOldestTimestamp);
          
          console.log(`✅ [Chart] Successfully loaded ${historicalCandles.length} historical candles`);
          console.log(`🔄 [Chart] Updated oldestTimestamp to: ${new Date(newOldestTimestamp).toISOString()}`);
          
          // ВАЖНО: Принудительно обновляем NightVision с новыми данными
          setTimeout(() => {
            if (nightVisionRef.current) {
              nightVisionRef.current.update("data");
              console.log(`🔄 [Chart] Force updated NightVision chart with new historical data`);
            }
          }, 100);
        } else {
          console.error(`❌ [Chart] Could not find chart data structure to update`);
        }
      } else {
        console.log(`📜 [Chart] No more historical data available`);
      }
    } catch (error) {
      console.error(`❌ [Chart] Failed to load historical data:`, error);
    } finally {
      setIsLoadingHistorical(false);
      setLoadingTimestamp(null);
      console.log(`🏁 [Chart] loadHistoricalData finished, isLoadingHistorical=${false}, loadingTimestamp=${null}`);
    }
  }, [exchange, symbol, timeframe, market, isLoadingHistorical, loadingTimestamp, providers, activeProviderId]); // Убрали oldestTimestamp из deps, используем ref

  const activeSubscriptions = getActiveSubscriptionsList();
  
  // Check if we have active subscription for current settings
  const currentSubscriptionKey = `${exchange}:${market}:${symbol}:candles:${timeframe}`;
  const currentSubscription = activeSubscriptions.find(sub => 
    sub.key.exchange === exchange && 
    sub.key.symbol === symbol && 
    sub.key.dataType === 'candles' &&
    sub.key.timeframe === timeframe &&
    sub.key.market === market
  );

  // Chart initialization flag
  const [isChartInitialized, setIsChartInitialized] = useState(false);
  const [chartDataLoaded, setChartDataLoaded] = useState(false);

  // Handle chart resize with ResizeObserver + force update after container changes
  useLayoutEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        const rect = chartRef.current.getBoundingClientRect();
        const newDimensions = {
          width: Math.max(rect.width || 600, 300),
          height: Math.max(rect.height || 400, 200)
        };
        
        setChartDimensions(prev => {
          if (prev.width !== newDimensions.width || prev.height !== newDimensions.height) {
            console.log(`📐 [Chart] Container dimensions: ${prev.width}x${prev.height} → ${newDimensions.width}x${newDimensions.height}`);
            return newDimensions;
          }
          return prev;
        });
      }
    };

    updateDimensions();

    // Use ResizeObserver to detect container size changes
    let resizeObserver: ResizeObserver | null = null;
    
    if (chartRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver((entries) => {
        if (entries.length > 0) {
          updateDimensions();
        }
      });
      
      resizeObserver.observe(chartRef.current);
      console.log(`👁️ [Chart] ResizeObserver attached`);
    } else {
      // Fallback for older browsers
      window.addEventListener('resize', updateDimensions);
    }

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
        console.log(`👁️ [Chart] ResizeObserver disconnected`);
      } else {
        window.removeEventListener('resize', updateDimensions);
      }
    };
  }, []);

  // Initialize empty NightVision chart
  useEffect(() => {
    if (!chartRef.current) return;

    try {
      // Destroy existing chart
      if (nightVisionRef.current) {
        nightVisionRef.current.destroy?.();
      }

      // Create new NightVision instance with empty data
      const chartId = `chart-${Date.now()}`;
      chartRef.current.id = chartId;
      nightVisionRef.current = new NightVision(chartId, {
        width: chartDimensions.width,
        height: chartDimensions.height,
        autoResize: true,
        colors: {
          back: chartColors.back,
          grid: chartColors.grid
        },
        data: { panes: [] } // Empty data initially
      });

      console.log(`📊 Empty NightVision chart initialized for ${exchange}:${symbol}:${timeframe}`);
      
      // Add infinite scroll event listener for range updates
      if (nightVisionRef.current.events) {
        nightVisionRef.current.events.on("app:$range-update", (range: [number, number]) => {
          console.log(`📊 [Chart] Range updated: [${new Date(range[0]).toISOString()}, ${new Date(range[1]).toISOString()}]`);
          
          // Детальное логирование состояния
          console.log(`🔍 [Chart] Infinite scroll state check:`);
          console.log(`   oldestTimestamp (state): ${oldestTimestamp ? new Date(oldestTimestamp).toISOString() : 'null'}`);
          console.log(`   oldestTimestampRef: ${oldestTimestampRef.current ? new Date(oldestTimestampRef.current).toISOString() : 'null'}`);
          console.log(`   isLoadingHistorical: ${isLoadingHistorical}`);
          console.log(`   loadingTimestamp: ${loadingTimestamp ? new Date(loadingTimestamp).toISOString() : 'null'}`);
          
          // ПРИОРИТЕТ: Используем самое актуальное значение
          let effectiveOldestTimestamp = oldestTimestampRef.current || oldestTimestamp;
          
          // Если нет сохраненного timestamp, извлекаем из данных графика
          if (!effectiveOldestTimestamp) {
            let chartData = null;
            
            // Сначала пробуем hub.mainOv.data (используется WebSocket)
            if (nightVisionRef.current?.hub?.mainOv?.data && nightVisionRef.current.hub.mainOv.data.length > 0) {
              chartData = nightVisionRef.current.hub.mainOv.data;
              effectiveOldestTimestamp = chartData[0][0]; // Первый timestamp
              console.log(`🔧 [Chart] Extracted oldest from hub.mainOv.data: ${new Date(effectiveOldestTimestamp).toISOString()}`);
            }
            // Fallback на panes структуру (REST)
            else if (nightVisionRef.current?.data?.panes?.[0]?.overlays?.[0]?.data && 
                     nightVisionRef.current.data.panes[0].overlays[0].data.length > 0) {
              chartData = nightVisionRef.current.data.panes[0].overlays[0].data;
              effectiveOldestTimestamp = chartData[0][0]; // Первый timestamp
              console.log(`🔧 [Chart] Extracted oldest from panes: ${new Date(effectiveOldestTimestamp).toISOString()}`);
            }
            
            // Обновляем ref если извлекли новое значение
            if (effectiveOldestTimestamp) {
              oldestTimestampRef.current = effectiveOldestTimestamp;
              console.log(`🔧 [Chart] Updated oldestTimestampRef to: ${new Date(effectiveOldestTimestamp).toISOString()}`);
            }
          }
          
          console.log(`🔍 [Chart] Effective oldest timestamp: ${effectiveOldestTimestamp ? new Date(effectiveOldestTimestamp).toISOString() : 'null'}`);
          
          if (effectiveOldestTimestamp && !isLoadingHistorical) {
            const shouldLoad = shouldLoadMoreData(range, effectiveOldestTimestamp);
            console.log(`🔍 [Chart] Should load more data: ${shouldLoad}`);
            
            if (shouldLoad) {
              console.log(`📜 [Chart] Triggering historical data load for timestamp: ${new Date(effectiveOldestTimestamp).toISOString()}`);
              loadHistoricalData(effectiveOldestTimestamp);
            }
          } else {
            const reason = !effectiveOldestTimestamp ? 'no oldest timestamp' : 
                          isLoadingHistorical ? 'already loading' : 'unknown';
            console.log(`⏸️ [Chart] Skipping infinite scroll: ${reason}`);
          }
        });
        console.log(`📊 [Chart] Range update listener added for infinite scroll`);
      } else {
        console.warn(`⚠️ [Chart] NightVision events API not available`);
      }
      
      // Debug: log available methods and properties
      console.log(`🔍 [Chart] NightVision instance methods:`, Object.getOwnPropertyNames(nightVisionRef.current).filter(prop => typeof nightVisionRef.current[prop] === 'function'));
      console.log(`🔍 [Chart] NightVision instance properties:`, Object.keys(nightVisionRef.current));
      if (nightVisionRef.current.hub) {
        console.log(`🔍 [Chart] NightVision hub properties:`, Object.keys(nightVisionRef.current.hub));
      }
      
      setIsChartInitialized(true);
    } catch (error) {
      console.error('❌ Failed to initialize NightVision chart:', error);
      setError('Failed to initialize chart');
      setIsChartInitialized(false);
    }

    return () => {
      if (nightVisionRef.current) {
        nightVisionRef.current.destroy?.();
        nightVisionRef.current = null;
      }
      setIsChartInitialized(false);
    };
  }, [exchange, symbol, timeframe, market, chartColors]);

          // REST data initialization
  useEffect(() => {
    if (!isChartInitialized || !nightVisionRef.current) return;

    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setChartDataLoaded(false);

        console.log(`🚀 [Chart] Loading initial data via REST for ${exchange}:${market}:${symbol}:${timeframe}`);
        
        const candles = await initializeChartData(exchange, symbol, timeframe, market);
        
        if (candles && candles.length > 0 && nightVisionRef.current) {
          // Конвертируем в NightVision формат
          const ohlcvData = candles.map(candle => [
            candle.timestamp,
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume
          ]);

          // Создаем panes структуру
          const panes = [
            {
              overlays: [
                {
                  name: generateOverlayName(symbol, exchange, market),
                  type: 'Candles',
                  data: ohlcvData,
                  main: true,
                  props: {
                    colorCandleUp: chartColors.candleUp,
                    colorCandleDw: chartColors.candleDw,
                    colorWickUp: chartColors.wickUp,
                    colorWickDw: chartColors.wickDw,
                  }
                }
              ]
            }
          ];

          // Добавляем volume pane если включен
          if (showVolume) {
            const volumeData = candles.map(candle => [
              candle.timestamp,
              candle.volume
            ]);

            panes.push({
              overlays: [
                {
                  name: 'Volume',
                  type: 'Volume',
                  data: volumeData,
                  main: false,
                  props: {
                    colorCandleUp: chartColors.volUp,
                    colorCandleDw: chartColors.volDw,
                    colorWickUp: chartColors.volUp,
                    colorWickDw: chartColors.volDw,
                  }
                }
              ]
            });
          }

          // Обновляем chart напрямую
          nightVisionRef.current.data = { panes };
          nightVisionRef.current.update("data");
          
          // Initialize oldest timestamp for infinite scroll
          const oldestTs = candles[0].timestamp;
          setOldestTimestamp(oldestTs);
          oldestTimestampRef.current = oldestTs; // Также инициализируем ref
          console.log(`🕰️ [Chart] Oldest timestamp initialized: ${new Date(oldestTs).toISOString()} (${oldestTs})`);
          
          setChartDataLoaded(true);
          console.log(`✅ [Chart] Initial data loaded: ${candles.length} candles`);
          
          // АВТОМАТИЧЕСКАЯ WS ПОДПИСКА после успешной загрузки REST данных
          if (activeProviderId && !isSubscribed) {
            try {
              console.log(`🚀 [Chart] Starting automatic WS subscription after REST load`);
              const subscriberId = `${dashboardId}-${widgetId}`;
              const result = await subscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
              
              if (result.success) {
                setIsSubscribed(true);
                console.log(`✅ [Chart] Automatic WS subscription started successfully`);
              } else {
                console.warn(`⚠️ [Chart] Automatic WS subscription failed: ${result.error}`);
              }
            } catch (subscribeError) {
              console.warn(`⚠️ [Chart] Failed to start automatic WS subscription:`, subscribeError);
            }
          }
        }
      } catch (error) {
        console.error(`❌ [Chart] Failed to load initial data:`, error);
        setError(error instanceof Error ? error.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [isChartInitialized, exchange, symbol, timeframe, market, showVolume, initializeChartData, chartColors]);

  // autoResize: true автоматически управляет размерами
  // Оставляем только простое логирование для диагностики
  // Handle container resize by RECREATING NightVision instance (with debouncing)
  useEffect(() => {
    if (!nightVisionRef.current || !isChartInitialized) {
      console.log(`⏸️ [Chart] Skipping resize - chart not ready:`, { 
        hasChart: !!nightVisionRef.current, 
        isInitialized: isChartInitialized 
      });
      return;
    }

    console.log(`📐 [Chart] Container dimensions changed: ${chartDimensions.width}x${chartDimensions.height}`);
    console.log(`⏳ [Chart] Scheduling NightVision recreation with 200ms debounce...`);
    
    // Debounce resize with 200ms delay to avoid excessive recreations
    const timeoutId = setTimeout(() => {
      console.log(`🔄 [Chart] Executing debounced NightVision recreation...`);
      
      if (!nightVisionRef.current) {
        console.log(`❌ [Chart] NightVision ref lost during debounce`);
        return;
      }
      
      // Store current chart data before recreation
      const currentData = nightVisionRef.current.data;
      
      // Destroy old instance
      if (nightVisionRef.current.destroy) {
        nightVisionRef.current.destroy();
      }
      
      // Create new instance with new dimensions
      const chartId = `chart-${Date.now()}`;
      if (chartRef.current) {
        chartRef.current.id = chartId;
        nightVisionRef.current = new NightVision(chartId, {
          width: chartDimensions.width,
          height: chartDimensions.height,
          autoResize: true,
          colors: {
            back: chartColors.back,
            grid: chartColors.grid
          },
          data: currentData // Restore data
        });
        
        console.log(`✅ [Chart] NightVision instance recreated with dimensions: ${chartDimensions.width}x${chartDimensions.height}`);
      }
    }, 200); // 200ms debounce
    
    // Cleanup timeout if effect runs again before completion
    return () => {
      clearTimeout(timeoutId);
      console.log(`🧹 [Chart] Cleared pending resize timeout`);
    };
  }, [chartDimensions]);

  // Event-driven chart updates (заменяем polling на events из store)
  const chartUpdateListener = useCallback((event: ChartUpdateEvent) => {
    if (!nightVisionRef.current || !chartDataLoaded) {
      console.log(`📊 [Chart] Event received but chart not ready:`, event.type, { chartReady: !!nightVisionRef.current, dataLoaded: chartDataLoaded });
      return;
    }

    const chartInstance = nightVisionRef.current;
    
    console.log(`📊 [Chart] Processing ${event.type} event:`, {
      type: event.type,
      exchange: event.exchange,
      symbol: event.symbol,
      timeframe: event.timeframe,
      data: event.data
    });

    try {
      if (event.type === 'new_candles') {
        // Новые свечи - добавляем в конец
        if (event.data?.newCandles && chartInstance.hub && chartInstance.hub.mainOv && chartInstance.hub.mainOv.data) {
          const newOhlcvData = event.data.newCandles.map((candle: Candle) => [
            candle.timestamp,
            candle.open,
            candle.high,
            candle.low,
            candle.close,
            candle.volume
          ]);
          
          const mainData = chartInstance.hub.mainOv.data;
          mainData.push(...newOhlcvData);
          chartInstance.update("data");
          console.log(`📈 [Chart] Added ${newOhlcvData.length} new candles`);
        }
      }
      else if (event.type === 'update_last_candle') {
        // Update last candle - efficient update
        if (event.data?.lastCandle && chartInstance.hub && chartInstance.hub.mainOv && chartInstance.hub.mainOv.data) {
          const mainData = chartInstance.hub.mainOv.data;
          const lastIndex = mainData.length - 1;
          
          if (lastIndex >= 0) {
            const updatedCandle = [
              event.data.lastCandle.timestamp,
              event.data.lastCandle.open,
              event.data.lastCandle.high,
              event.data.lastCandle.low,
              event.data.lastCandle.close,
              event.data.lastCandle.volume
            ];
            
            mainData[lastIndex] = updatedCandle;
            chartInstance.update(); // Efficient update without "data" parameter
            console.log(`🔄 [Chart] Updated last candle: close=${event.data.lastCandle.close}`);
          }
        }
      }
      // Ignore initial_load - use REST initialization
    } catch (error) {
      console.error('❌ [Chart] Event processing error:', error);
    }
  }, [chartDataLoaded]);

  // Ref for storing previous event listener settings
  const previousEventListenerRef = useRef<{
    exchange: string;
    symbol: string;
    timeframe: Timeframe;
    market: MarketType;
  } | null>(null);

  // Store event subscription with proper cleanup
  useEffect(() => {
    if (!nightVisionRef.current) return;

    // Unsubscribe from previous events if they exist
    if (previousEventListenerRef.current) {
      const prev = previousEventListenerRef.current;
      console.log(`📺 [Chart] Unsubscribing from PREVIOUS events: ${prev.exchange}:${prev.symbol}:${prev.timeframe}:${prev.market}`);
      removeChartUpdateListener(prev.exchange, prev.symbol, prev.timeframe, prev.market, chartUpdateListener);
    }

    console.log(`📺 [Chart] Subscribing to events for ${exchange}:${symbol}:${timeframe}:${market}`);
    
    // Add listener for new settings
    addChartUpdateListener(exchange, symbol, timeframe, market, chartUpdateListener);
    
    // Save settings as previous
    previousEventListenerRef.current = { exchange, symbol, timeframe, market };

    return () => {
      console.log(`📺 [Chart] Cleanup: Unsubscribing from events for ${exchange}:${symbol}:${timeframe}:${market}`);
      removeChartUpdateListener(exchange, symbol, timeframe, market, chartUpdateListener);
      previousEventListenerRef.current = null;
    };
  }, [exchange, symbol, timeframe, market, chartUpdateListener, addChartUpdateListener, removeChartUpdateListener]);

  // Subscription management
  const handleSubscribe = async () => {
    if (!activeProviderId) {
      setError('No active data provider');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const subscriberId = `${dashboardId}-${widgetId}`;
      const result = await subscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
      
      if (result.success) {
        setIsSubscribed(true);
        
        // IMPORTANT: Save current settings as previous AFTER successful subscription
        previousSubscriptionRef.current = { exchange, symbol, timeframe, market };
        
        console.log(`📊 Chart subscribed to ${exchange}:${market}:${symbol}:${timeframe} (method: ${dataFetchSettings.method})`);
        console.log(`💾 Saved as previous subscription: ${exchange}:${market}:${symbol}:${timeframe}`);
      } else {
        setError(result.error || 'Subscription failed');
      }
    } catch (error) {
      console.error('❌ Subscription error:', error);
      setError(error instanceof Error ? error.message : 'Subscription failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = () => {
    const subscriberId = `${dashboardId}-${widgetId}`;
    unsubscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
    setIsSubscribed(false);
    console.log(`📊 Chart unsubscribed from ${exchange}:${market}:${symbol}:${timeframe}`);
  };

    // Ref for storing previous subscription settings
  const previousSubscriptionRef = useRef<{
    exchange: string;
    symbol: string;
    timeframe: Timeframe;
    market: MarketType;
  } | null>(null);

  // Auto-subscribe when widget mounts or provider becomes available
  useEffect(() => {
    if (activeProviderId && !isSubscribed) {
      console.log(`📊 Chart auto-subscribing to ${exchange}:${market}:${symbol}:${timeframe}`);
      handleSubscribe();
    }
  }, [activeProviderId]);

  // Proper subscription management when settings change
  useEffect(() => {
    if (isSubscribed) {
      // Unsubscribe from PREVIOUS settings if they exist
      if (previousSubscriptionRef.current) {
        const prev = previousSubscriptionRef.current;
        console.log(`🛑 Chart unsubscribing from PREVIOUS settings: ${prev.exchange}:${prev.market}:${prev.symbol}:${prev.timeframe}`);
        
        const subscriberId = `${dashboardId}-${widgetId}`;
        unsubscribe(subscriberId, prev.exchange, prev.symbol, 'candles', prev.timeframe, prev.market);
      }
      
      // Subscribe to NEW settings (saving will happen in handleSubscribe)
      setTimeout(() => {
        console.log(`🚀 Chart subscribing to NEW settings: ${exchange}:${market}:${symbol}:${timeframe}`);
        handleSubscribe();
      }, 100);
    }
  }, [exchange, symbol, timeframe, market]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (previousSubscriptionRef.current && isSubscribed) {
        const prev = previousSubscriptionRef.current;
        console.log(`🧹 Chart cleanup: unsubscribing from ${prev.exchange}:${prev.market}:${prev.symbol}:${prev.timeframe}`);
        
        const subscriberId = `${dashboardId}-${widgetId}`;
        unsubscribe(subscriberId, prev.exchange, prev.symbol, 'candles', prev.timeframe, prev.market);
      }
    };
  }, []);





  return (
    <div className="flex flex-col h-full bg-terminal-bg border border-terminal-border rounded-lg">
      {/* Chart Container */}
      <div className="flex-1 relative">
        {/* Timeframe Selector - Absolutely positioned */}
        <TimeframeSelect 
          value={timeframe}
          onChange={setTimeframe}
        />
        
        <div 
          ref={chartRef} 
          className="absolute inset-0 w-full h-full"
          style={{ minHeight: '300px' }}
        />
        
        {/* Loading/Error Overlay */}
        {(isLoading || error || !chartDataLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center bg-terminal-bg/80">
            {isLoading ? (
              <div className="flex items-center gap-2 text-terminal-muted">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading chart data...
              </div>
            ) : error ? (
              <div className="text-red-400 text-center">
                <div className="font-medium">Chart Error</div>
                <div className="text-sm">{error}</div>
              </div>
            ) : (
              <div className="text-terminal-muted text-center">
                <div className="font-medium">Chart Ready</div>
                <div className="text-sm">Start subscription to see real-time data</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Chart;
