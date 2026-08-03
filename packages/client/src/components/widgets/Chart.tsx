import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { NightVision } from 'night-vision';
import { useTheme } from '../../hooks/useTheme';
import { useDataProviderStore } from '../../store/dataProviderStore';
import { useGroupStore } from '../../store/groupStore';
import { useChartWidgetsStore } from '../../store/chartWidgetStore';
import { Timeframe, MarketType, ChartUpdateEvent, Candle } from '../../types/dataProviders';
import TimeframeSelect from '../ui/TimeframeSelect';

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
  selectedGroupId?: string;
  initialTimeframe?: Timeframe;
}

const Chart: React.FC<ChartProps> = ({
  dashboardId = 'default',
  widgetId = 'chart-widget',
  selectedGroupId,
  initialTimeframe = '1h'
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
    loadHistoricalCandles,
    providers,
    activeProviderId,
    dataFetchSettings,
    getActiveSubscriptionsList,
    addChartUpdateListener,
    removeChartUpdateListener
  } = useDataProviderStore();

  // Group store integration - единый источник данных о выбранном инструменте
  const { getGroupById, selectedGroupId: globalSelectedGroupId, getTransparentGroup } = useGroupStore();
  const currentGroupId = selectedGroupId || globalSelectedGroupId;
  // Fallback to transparent group if no group is selected
  const selectedGroup = currentGroupId ? getGroupById(currentGroupId) : getTransparentGroup();

  // Chart widget store - только для timeframe и настроек виджета
  const { getWidget, updateWidget } = useChartWidgetsStore();
  const widgetState = getWidget(widgetId);

  // Проверка полноты выбранного инструмента. Candles are public market data —
  // no account and no credentials required, so `account` is deliberately NOT
  // part of this gate. Requiring it made a fresh install (which seeds only the
  // public half of the instrument) show "No instrument selected" instead of a
  // chart.
  const isInstrumentSelected = selectedGroup &&
    selectedGroup.exchange &&
    selectedGroup.market &&
    selectedGroup.tradingPair;

  // Получаем данные инструмента из selectedGroup или fallback значения
  const exchange = selectedGroup?.exchange || 'binance';
  const symbol = selectedGroup?.tradingPair || 'BTC/USDT';
  const market = (selectedGroup?.market as MarketType) || 'spot';
  const timeframe = widgetState.timeframe || initialTimeframe;

  // Widget state
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Chart state
  const [chartDimensions, setChartDimensions] = useState({ width: 600, height: 400 });
  const [showVolume, setShowVolume] = useState(false);

  // Infinite scroll state
  const oldestTimestampRef = useRef<number | null>(null);
  const isLoadingHistoricalRef = useRef<boolean>(false);
  const historicalLoadingIterationsRef = useRef<number>(0);

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

  // Initialize NightVision chart only when instrument is selected
  useEffect(() => {
    if (!chartRef.current || !isInstrumentSelected) {
      // Destroy chart if instrument is not selected
      if (nightVisionRef.current) {
        nightVisionRef.current.destroy?.();
        nightVisionRef.current = null;
        setIsChartInitialized(false);
      }
      return;
    }

    try {
      // СБРОС INFINITE SCROLL STATE при смене инструмента
      console.log(`🔄 [Chart] Resetting infinite scroll state for new instrument: ${exchange}:${symbol}:${timeframe}`);
      oldestTimestampRef.current = null;
      isLoadingHistoricalRef.current = false;
      historicalLoadingIterationsRef.current = 0;

      // Destroy existing chart
      if (nightVisionRef.current) {
        nightVisionRef.current.destroy?.();
      }

      // Create new NightVision instance with empty data
      const chartId = `chart-${crypto.randomUUID()}`;
      chartRef.current.id = chartId;
      nightVisionRef.current = new NightVision(chartId, {
        id: chartId, // ОБЯЗАТЕЛЬНО согласно документации!
        width: chartDimensions.width,
        height: chartDimensions.height,
        autoResize: true,
        colors: {
          back: chartColors.back,
          grid: chartColors.grid
        },
        data: { panes: [] } // Empty data initially
      } as any); // Type assertion для TypeScript

      console.log(`📊 NightVision chart initialized for ${exchange}:${symbol}:${timeframe}`);
      
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
  }, [isInstrumentSelected, exchange, symbol, timeframe, market, chartColors]);

          // REST data initialization
  useEffect(() => {
    if (!isChartInitialized || !nightVisionRef.current || !isInstrumentSelected) return;

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
          
          setChartDataLoaded(true);
          console.log(`✅ [Chart] Initial data loaded: ${candles.length} candles`);
          
          // Removed automatic WS subscription from here to avoid duplication
          // WS subscription will be handled by useEffect below
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

  // Infinite scroll: Load historical data when user scrolls left
  useEffect(() => {
    if (!nightVisionRef.current || !chartDataLoaded) return;

    const handleRangeUpdate = async (range: [number, number]) => {
      console.log(`📊 [Chart] ===== INFINITE SCROLL EVENT ===== Range updated: [${new Date(range[0]).toISOString()}, ${new Date(range[1]).toISOString()}]`);
      console.log(`📊 [Chart] Current NightVision structure:`, {
        hasHub: !!nightVisionRef.current?.hub,
        hasMainOv: !!nightVisionRef.current?.hub?.mainOv,
        hasMainOvData: !!nightVisionRef.current?.hub?.mainOv?.data,
        mainOvDataLength: nightVisionRef.current?.hub?.mainOv?.data?.length,
        hasData: !!nightVisionRef.current?.data,
        hasPanes: !!nightVisionRef.current?.data?.panes,
        panesLength: nightVisionRef.current?.data?.panes?.length,
        hasOverlays: !!nightVisionRef.current?.data?.panes?.[0]?.overlays,
        overlaysLength: nightVisionRef.current?.data?.panes?.[0]?.overlays?.length,
        hasOverlayData: !!nightVisionRef.current?.data?.panes?.[0]?.overlays?.[0]?.data,
        overlayDataLength: nightVisionRef.current?.data?.panes?.[0]?.overlays?.[0]?.data?.length,
      });
      
      // Extract oldest timestamp from chart data if not set
      let effectiveOldestTimestamp = oldestTimestampRef.current;
      if (!effectiveOldestTimestamp) {
        // Try to get from WebSocket structure first
        if (nightVisionRef.current?.hub?.mainOv?.data && nightVisionRef.current.hub.mainOv.data.length > 0) {
          effectiveOldestTimestamp = nightVisionRef.current.hub.mainOv.data[0][0];
          oldestTimestampRef.current = effectiveOldestTimestamp;
          console.log(`🔧 [Chart] Extracted oldestTimestamp from WebSocket data: ${new Date(effectiveOldestTimestamp).toISOString()}`);
        }
        // Try to get from REST structure
        else if (nightVisionRef.current?.data?.panes?.[0]?.overlays?.[0]?.data && nightVisionRef.current.data.panes[0].overlays[0].data.length > 0) {
          effectiveOldestTimestamp = nightVisionRef.current.data.panes[0].overlays[0].data[0][0];
          oldestTimestampRef.current = effectiveOldestTimestamp;
          console.log(`🔧 [Chart] Extracted oldestTimestamp from REST data: ${new Date(effectiveOldestTimestamp).toISOString()}`);
        }
      }

      // Check if we should load more historical data
      if (effectiveOldestTimestamp && !isLoadingHistoricalRef.current) {
        const rangeStart = range[0];
        const totalRange = range[1] - range[0];
        const buffer = totalRange * 0.2; // 20% buffer

        const shouldLoad = (rangeStart - effectiveOldestTimestamp) <= buffer;
        console.log(`🔍 [Chart] Should load more data: ${shouldLoad} (rangeStart=${new Date(rangeStart).toISOString()}, oldestTimestamp=${new Date(effectiveOldestTimestamp).toISOString()}, buffer=${Math.round(buffer / 1000)}s)`);

                 if (shouldLoad) {
           console.log(`📜 [Chart] Triggering historical data load...`);
           historicalLoadingIterationsRef.current = 0; // Сбрасываем счетчик при новом пользовательском действии
           await loadHistoricalData(effectiveOldestTimestamp);
         }
      } else {
        console.log(`⏸️ [Chart] Skipping infinite scroll: oldestTimestamp=${!!effectiveOldestTimestamp}, isLoading=${isLoadingHistoricalRef.current}`);
      }
    };

         const checkAndLoadMoreIfNeeded = async (currentOldestTimestamp: number) => {
       if (isLoadingHistoricalRef.current) {
         console.log(`⏸️ [Chart] Still loading, skipping buffer check...`);
         return;
       }

       // Ограничение на количество итераций загрузки (защита от бесконечной загрузки)
       const maxIterations = 5;
       if (historicalLoadingIterationsRef.current >= maxIterations) {
         console.log(`🛑 [Chart] Maximum historical loading iterations (${maxIterations}) reached, stopping`);
         historicalLoadingIterationsRef.current = 0; // Сбрасываем счетчик
         return;
       }

       // Получаем текущий диапазон после обновления
       const currentRange = nightVisionRef.current?.range;
       if (!currentRange) {
         console.log(`⚠️ [Chart] No current range available for buffer check`);
         return;
       }

       const rangeStart = currentRange[0];
       const totalRange = currentRange[1] - currentRange[0];
       const buffer = totalRange * 0.2; // 20% buffer

       const needsMoreData = (rangeStart - currentOldestTimestamp) <= buffer;
       console.log(`🔍 [Chart] Buffer check: needsMoreData=${needsMoreData} (rangeStart=${new Date(rangeStart).toISOString()}, oldestTimestamp=${new Date(currentOldestTimestamp).toISOString()}, buffer=${Math.round(buffer / 1000)}s, iteration=${historicalLoadingIterationsRef.current + 1}/${maxIterations})`);

       if (needsMoreData) {
         historicalLoadingIterationsRef.current += 1;
         console.log(`🔄 [Chart] Buffer still not filled, loading more historical data (iteration ${historicalLoadingIterationsRef.current}/${maxIterations})...`);
         await loadHistoricalData(currentOldestTimestamp);
       } else {
         console.log(`✅ [Chart] Buffer is sufficiently filled, stopping historical loading`);
         historicalLoadingIterationsRef.current = 0; // Сбрасываем счетчик после успешного заполнения
       }
     };

     const loadHistoricalData = async (beforeTimestamp: number) => {
       if (isLoadingHistoricalRef.current) {
         console.log(`⏸️ [Chart] Already loading historical data, skipping...`);
         return;
       }

       try {
         isLoadingHistoricalRef.current = true;
         console.log(`🚀 [Chart] Loading historical data before ${new Date(beforeTimestamp).toISOString()}`);

         // Load historical candles
         const historicalCandles = await loadHistoricalCandles(exchange, symbol, timeframe, market, beforeTimestamp);
        
        if (historicalCandles.length === 0) {
          console.log(`📊 [Chart] No historical data received`);
          return;
        }

        console.log(`📊 [Chart] Received ${historicalCandles.length} historical candles`);

        // Convert to OHLCV format for NightVision
        const historicalOhlcvData = historicalCandles.map(candle => [
          candle.timestamp,
          candle.open,
          candle.high,
          candle.low,
          candle.close,
          candle.volume
        ]);

        // Update both WebSocket and REST data structures
        let dataUpdated = false;

        // Update WebSocket structure (hub.mainOv.data)
        if (nightVisionRef.current?.hub?.mainOv?.data) {
          const currentData = nightVisionRef.current.hub.mainOv.data;
          const existingTimestamps = new Set(currentData.map((candle: any[]) => candle[0]));
          
          // Filter out duplicates
          const uniqueHistoricalData = historicalOhlcvData.filter(candle => 
            !existingTimestamps.has(candle[0])
          );

          if (uniqueHistoricalData.length > 0) {
            // Add to the beginning of the array (older data)
            currentData.unshift(...uniqueHistoricalData);
            dataUpdated = true;
            console.log(`📊 [Chart] Added ${uniqueHistoricalData.length} unique historical candles to WebSocket structure`);
          } else {
            console.log(`📊 [Chart] No new unique historical data to add to WebSocket structure`);
          }
        }

        // Update REST structure (panes[0].overlays[0].data)
        if (nightVisionRef.current?.data?.panes?.[0]?.overlays?.[0]?.data) {
          const currentData = nightVisionRef.current.data.panes[0].overlays[0].data;
          const existingTimestamps = new Set(currentData.map((candle: any[]) => candle[0]));
          
          // Filter out duplicates
          const uniqueHistoricalData = historicalOhlcvData.filter(candle => 
            !existingTimestamps.has(candle[0])
          );

          if (uniqueHistoricalData.length > 0) {
            // Add to the beginning of the array (older data)
            currentData.unshift(...uniqueHistoricalData);
            dataUpdated = true;
            console.log(`📊 [Chart] Added ${uniqueHistoricalData.length} unique historical candles to REST structure`);
          } else {
            console.log(`📊 [Chart] No new unique historical data to add to REST structure`);
          }
        }

                 if (dataUpdated) {
           // Update the oldest timestamp reference
           const newOldestTimestamp = historicalCandles[0].timestamp;
           oldestTimestampRef.current = newOldestTimestamp;
           
           // Force chart update
           nightVisionRef.current.update("data");
           console.log(`✅ [Chart] Updated chart with historical data, new oldestTimestamp: ${new Date(newOldestTimestamp).toISOString()}`);
           
           // ВАЖНО: Проверить нужно ли загрузить еще данных для заполнения буфера
           setTimeout(async () => {
             await checkAndLoadMoreIfNeeded(newOldestTimestamp);
           }, 100); // Небольшая задержка для обновления графика
         } else {
           console.log(`⚠️ [Chart] No data structures found to update`);
         }

      } catch (error) {
        console.error(`❌ [Chart] Failed to load historical data:`, error);
      } finally {
        isLoadingHistoricalRef.current = false;
      }
    };

    // Add NightVision range update listener
    nightVisionRef.current.events.on("app:$range-update", handleRangeUpdate);
    console.log(`📺 [Chart] Added infinite scroll range update listener`);

    return () => {
      if (nightVisionRef.current?.events) {
        nightVisionRef.current.events.off("app:$range-update", handleRangeUpdate);
        console.log(`📺 [Chart] Removed infinite scroll range update listener`);
      }
    };
  }, [chartDataLoaded, exchange, symbol, timeframe, market, loadHistoricalCandles]);

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
      const chartId = `chart-${crypto.randomUUID()}`;
      if (chartRef.current) {
        chartRef.current.id = chartId;
        nightVisionRef.current = new NightVision(chartId, {
          id: chartId, // ОБЯЗАТЕЛЬНО согласно документации!
          width: chartDimensions.width,
          height: chartDimensions.height,
          autoResize: true,
          colors: {
            back: chartColors.back,
            grid: chartColors.grid
          },
          data: currentData // Restore data
        } as any); // Type assertion для TypeScript
        
        console.log(`✅ [Chart] NightVision instance recreated with dimensions: ${chartDimensions.width}x${chartDimensions.height}`);
      }
    }, 200); // 200ms debounce
    
    // Cleanup timeout if effect runs again before completion
    return () => {
      clearTimeout(timeoutId);
      console.log(`🧹 [Chart] Cleared pending resize timeout`);
    };
  }, [chartDimensions, isChartInitialized]);

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
      const subscriberId = `${dashboardId}-${widgetId}`;
      
      // Очистка подписки по текущим настройкам
      console.log(`🧹 Chart cleanup: unsubscribing from current settings ${exchange}:${market}:${symbol}:${timeframe}`);
      unsubscribe(subscriberId, exchange, symbol, 'candles', timeframe, market);
      
      // Дополнительная очистка по предыдущим настройкам (если отличаются)
      if (previousSubscriptionRef.current) {
        const prev = previousSubscriptionRef.current;
        if (prev.exchange !== exchange || prev.symbol !== symbol || 
            prev.timeframe !== timeframe || prev.market !== market) {
          console.log(`🧹 Chart cleanup: also unsubscribing from previous settings ${prev.exchange}:${prev.market}:${prev.symbol}:${prev.timeframe}`);
          unsubscribe(subscriberId, prev.exchange, prev.symbol, 'candles', prev.timeframe, prev.market);
        }
      }
    };
  }, [dashboardId, widgetId, exchange, symbol, timeframe, market, unsubscribe]);





  // Handler для изменения timeframe
  const handleTimeframeChange = (newTimeframe: Timeframe) => {
    updateWidget(widgetId, { timeframe: newTimeframe });
  };

  return (
    <div className="flex flex-col h-full bg-terminal-bg border border-terminal-border rounded-lg">
      {/* Проверка выбранного инструмента */}
      {!isInstrumentSelected ? (
        <div className="flex-1 flex items-center justify-center bg-terminal-bg">
          <div className="text-center text-terminal-muted">
            <div className="text-lg font-medium mb-2">No instrument selected</div>
            <div className="text-sm">Please select a trading instrument in the selector above</div>
          </div>
        </div>
      ) : (
        <>
          {/* Chart Container */}
          <div className="flex-1 relative">
                    {/* Timeframe Selector - Absolutely positioned */}
        <TimeframeSelect
          value={timeframe}
          onChange={handleTimeframeChange}
          exchange={exchange}
        />
        {/* Debug: Show current exchange */}
        {process.env.NODE_ENV === 'development' && (
          <div className="absolute top-4 left-4 text-xs text-terminal-muted bg-terminal-bg/80 px-2 py-1 rounded">
            Exchange: {exchange || 'undefined'}
          </div>
        )}
        
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
        </>
      )}
    </div>
  );
};

export default Chart;
