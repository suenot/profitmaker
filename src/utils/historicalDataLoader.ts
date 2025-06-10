/**
 * Historical Data Loader for Infinite Scroll
 * Loads older candles when user scrolls to the left edge of the chart
 */

import type { Candle, Timeframe, MarketType, DataProvider } from '../types/dataProviders';
import { getCCXT } from '../store/utils/ccxtUtils';
import { createExchangeInstance } from '../store/utils/providerUtils';
import { getOHLCVLimit } from './exchangeLimits';

interface HistoricalDataLoader {
  exchange: string;
  symbol: string;
  timeframe: Timeframe;
  market: MarketType;
  isLoading: boolean;
  oldestTimestamp: number | null;
  hasMoreData: boolean;
}

// Rate limiting queue - простая очередь запросов раз в секунду
class RequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private readonly MIN_INTERVAL = 1000; // 1 секунда между запросами

  async add<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.MIN_INTERVAL) {
        const waitTime = this.MIN_INTERVAL - timeSinceLastRequest;
        console.log(`⏰ [RequestQueue] Waiting ${waitTime}ms for rate limit...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      const request = this.queue.shift();
      if (request) {
        this.lastRequestTime = Date.now();
        await request();
      }
    }
    
    this.processing = false;
  }
}

const requestQueue = new RequestQueue();

/**
 * Load historical candles before the oldest timestamp
 */
export const loadHistoricalCandles = async (
  exchange: string,
  symbol: string,
  timeframe: Timeframe,
  market: MarketType,
  oldestTimestamp: number,
  provider: DataProvider
): Promise<Candle[]> => {
  console.log(`📜 [HistoricalLoader] Loading historical data for ${exchange}:${symbol}:${timeframe} before ${new Date(oldestTimestamp).toISOString()}`);
  
  return requestQueue.add(async () => {
    console.log(`🔄 [historicalDataLoader] Executing rate-limited request for ${exchange}:${symbol}`);
    
    // Переключаемся на Bybit если был Binance
    const actualExchange = exchange === 'binance' ? 'bybit' : exchange;
    console.log(`🔄 [historicalDataLoader] Using exchange: ${actualExchange} (original: ${exchange})`);
    
    const ccxt = getCCXT();
    if (!ccxt) {
      throw new Error('CCXT not available');
    }

    const exchangeInstance = createExchangeInstance(actualExchange, provider, ccxt);
    
    // Get optimal limit for this exchange
    const limit = getOHLCVLimit(actualExchange);
    
    // Calculate timeframe duration in milliseconds
    const timeframeDuration = getTimeframeDuration(timeframe);
    
    // Calculate 'since' timestamp (load data BEFORE the oldest timestamp)
    const sinceTimestamp = oldestTimestamp - (limit * timeframeDuration);
    
    console.log(`📜 [HistoricalLoader] Fetching ${limit} candles since ${new Date(sinceTimestamp).toISOString()}`);
    
    // Load historical data using CCXT with 'since' parameter
    const ohlcvData = await exchangeInstance.fetchOHLCV(
      symbol, 
      timeframe, 
      sinceTimestamp, // Key parameter: load data FROM this timestamp
      limit
    );
    
    if (!ohlcvData || ohlcvData.length === 0) {
      console.log(`📜 [HistoricalLoader] No historical data available before ${new Date(oldestTimestamp).toISOString()}`);
      return [];
    }
    
    // Convert to Candle format and filter out candles that are >= oldestTimestamp
    const historicalCandles: Candle[] = ohlcvData
      .filter((c: any[]) => c[0] < oldestTimestamp) // Only candles BEFORE existing data
      .map((c: any[]) => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5]
      }))
      .sort((a, b) => a.timestamp - b.timestamp); // Sort by timestamp ascending
    
    console.log(`✅ [HistoricalLoader] Loaded ${historicalCandles.length} historical candles`);
    
    return historicalCandles;
  });
};

/**
 * Get timeframe duration in milliseconds
 */
export const getTimeframeDuration = (timeframe: Timeframe): number => {
  const durations: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000
  };
  
  return durations[timeframe] || 60 * 60 * 1000; // Default to 1 hour
};

/**
 * Create a historical data loader state manager
 */
export const createHistoricalDataLoader = (
  exchange: string,
  symbol: string,
  timeframe: Timeframe,
  market: MarketType
): HistoricalDataLoader => {
  return {
    exchange,
    symbol,
    timeframe,
    market,
    isLoading: false,
    oldestTimestamp: null,
    hasMoreData: true
  };
};

/**
 * Check if we should load more historical data based on NightVision range
 */
export const shouldLoadMoreData = (
  chartRange: [number, number], // [start, end] timestamps
  oldestTimestamp: number,
  bufferRatio: number = 0.2 // Load when user is within 20% of the left edge
): boolean => {
  const [rangeStart, rangeEnd] = chartRange;
  const rangeWidth = rangeEnd - rangeStart;
  const bufferWidth = rangeWidth * bufferRatio;
  
  // ИСПРАВЛЕНИЕ: Проверяем близость к СТАРЫМ данным
  // Если rangeStart близко к oldestTimestamp, нужно загружать больше данных
  const distanceToOldest = rangeStart - oldestTimestamp;
  const isNearLeftEdge = distanceToOldest <= bufferWidth;
  
  console.log(`🔍 [HistoricalLoader] Detailed range check:`);
  console.log(`   Range: [${new Date(rangeStart).toISOString()}, ${new Date(rangeEnd).toISOString()}]`);
  console.log(`   Oldest: ${new Date(oldestTimestamp).toISOString()}`);
  console.log(`   Range width: ${Math.round(rangeWidth / 1000 / 60)} minutes`);
  console.log(`   Buffer width: ${Math.round(bufferWidth / 1000 / 60)} minutes (${bufferRatio * 100}%)`);
  console.log(`   Distance to oldest: ${Math.round(distanceToOldest / 1000 / 60)} minutes`);
  console.log(`   Need more data? ${distanceToOldest} <= ${bufferWidth} = ${isNearLeftEdge}`);
  
  return isNearLeftEdge;
}; 