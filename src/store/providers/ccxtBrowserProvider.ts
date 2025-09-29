import { getCCXT, getCCXTPro } from '../utils/ccxtUtils';
import { wrapExchangeWithLogger } from '../../utils/requestLogger';
import type { CCXTBrowserProvider } from '../../types/dataProviders';
import {
  createCCXTInstanceConfig,
  createInstanceCacheKey,
  createExchangeInstanceConfig,
  logInstanceCreation,
  getAvailableMarkets,
  type CCXTInstanceConfig
} from '../utils/ccxtProviderUtils';
import { ccxtInstanceManager } from '../utils/ccxtInstanceManager';

// CCXTInstanceConfig теперь импортируется из общих утилит

/**
 * CCXT Browser Provider Implementation
 * Uses ccxtInstanceManager for unified instance caching
 */
export class CCXTBrowserProviderImpl {
  private provider: CCXTBrowserProvider;

  constructor(provider: CCXTBrowserProvider) {
    this.provider = provider;
  }


  /**
   * Получает или создает CCXT instance используя ccxtInstanceManager
   */
  private static async getCCXTInstance(config: CCXTInstanceConfig): Promise<any> {
    console.log(`🔄 [CCXTBrowser] Delegating to ccxtInstanceManager for ${config.exchangeId}:${config.marketType}`);

    // Для Pro версии CCXT пока используем существующую логику
    // TODO: Расширить ccxtInstanceManager для поддержки Pro версии
    if (config.ccxtType === 'pro') {
      console.warn(`⚠️ [CCXTBrowser] CCXT Pro not yet supported by ccxtInstanceManager, using fallback`);

      const ccxtLib = getCCXTPro();
      if (!ccxtLib) {
        throw new Error('CCXT Pro not available');
      }

      const ExchangeClass = ccxtLib[config.exchangeId];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${config.exchangeId} not found in CCXT Pro`);
      }

      const instanceConfig = {
        sandbox: config.sandbox || false,
        apiKey: config.apiKey,
        secret: config.secret,
        password: config.password,
        enableRateLimit: true,
        defaultType: config.marketType,
      };

      const exchangeInstance = new ExchangeClass(instanceConfig);
      return wrapExchangeWithLogger(
        exchangeInstance,
        config.exchangeId,
        `${config.userId}:${config.accountId}`
      );
    }

    // Используем ccxtInstanceManager для regular CCXT
    return ccxtInstanceManager.getExchangeInstanceForMarket(
      config.exchangeId,
      config.accountId,
      {
        apiKey: config.apiKey,
        secret: config.secret,
        password: config.password,
        sandbox: config.sandbox
      },
      config.marketType
    );
  }

  /**
   * Получает CCXT instance для торговых операций (с API ключами)
   */
  async getTradingInstance(
    userId: string,
    accountId: string,
    exchangeId: string,
    marketType: string,
    ccxtType: 'regular' | 'pro',
    credentials: {
      apiKey: string;
      secret: string;
      password?: string;
      sandbox?: boolean;
    }
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      credentials
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает CCXT instance для получения метаданных (без API ключей)
   */
  async getMetadataInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      'metadata',
      'public',
      exchangeId,
      marketType,
      'regular', // Для метаданных всегда используем regular
      { sandbox }
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает CCXT Pro instance для WebSocket подписок (без API ключей)
   */
  async getWebSocketInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = createCCXTInstanceConfig(
      this.provider.id,
      'websocket',
      'public',
      exchangeId,
      marketType,
      'pro', // Для WebSocket используем pro
      { sandbox }
    );

    return CCXTBrowserProviderImpl.getCCXTInstance(config);
  }

  /**
   * Получает все доступные символы для биржи с фильтрацией по типу рынка
   */
  async getSymbolsForExchange(exchange: string, limit?: number, marketType?: string): Promise<string[]> {
    try {
      // Используем метаданные instance (без API ключей)
      const exchangeInstance = await this.getMetadataInstance(exchange, marketType || 'spot');

      if (!exchangeInstance.markets) {
        console.warn(`Markets not loaded for ${exchange}`);
        return [];
      }

      // Get all symbols from markets
      const symbols = Object.keys(exchangeInstance.markets);
      
      // Filter to get only active symbols and apply market type filter
      const activeSymbols = symbols
        .filter(symbol => {
          const market = exchangeInstance.markets[symbol];
          if (!market || market.active === false) {
            return false;
          }

          // Apply market type filter if specified
          if (marketType) {
            const marketTypeToFilter = marketType.toLowerCase();
            const marketTypeValue = market.type?.toLowerCase();
            
            // Handle different market type naming conventions
            if (marketTypeToFilter === 'spot') {
              return marketTypeValue === 'spot';
            } else if (marketTypeToFilter === 'margin') {
              return marketTypeValue === 'spot' || marketTypeValue === 'margin';
            } else if (marketTypeToFilter === 'futures' || marketTypeToFilter === 'future') {
              return marketTypeValue === 'future' || marketTypeValue === 'futures' || 
                     (symbol.includes(':') && /:.*\d{6}/.test(symbol) && !symbol.includes('-C') && !symbol.includes('-P'));
            } else if (marketTypeToFilter === 'swap' || marketTypeToFilter === 'perpetual') {
              return marketTypeValue === 'swap' || marketTypeValue === 'perpetual' ||
                     (!marketTypeValue && (
                       (symbol.includes(':') && !/:.*\d{6}/.test(symbol)) || 
                       (!symbol.includes(':') && !symbol.includes('-C') && !symbol.includes('-P'))
                     ));
            } else if (marketTypeToFilter === 'options' || marketTypeToFilter === 'option') {
              return marketTypeValue === 'option' || marketTypeValue === 'options' ||
                     symbol.includes('-C') || symbol.includes('-P');
            } else {
              return marketTypeValue === marketTypeToFilter;
            }
          }

          return true;
        })
        .sort((a, b) => {
          if (a.includes('BTC')) return -1;
          if (b.includes('BTC')) return 1;
          if (a.includes('ETH')) return -1;
          if (b.includes('ETH')) return 1;
          return a.localeCompare(b);
        });

      const resultSymbols = limit && limit > 0 ? activeSymbols.slice(0, limit) : activeSymbols;

      console.log(`📊 [CCXTBrowser] Retrieved ${resultSymbols.length} symbols for ${exchange}${marketType ? ` (${marketType} market)` : ''}`);
      
      return resultSymbols;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting symbols for exchange: ${exchange}`, error);
      return [];
    }
  }

  /**
   * Определяет доступные рынки для биржи
   */
  async getMarketsForExchange(exchange: string): Promise<string[]> {
    try {
      // Используем ccxtInstanceManager для получения metadata instance
      const exchangeInstance = await ccxtInstanceManager.getExchangeInstanceForMarket(
        exchange,
        'metadata-account',
        {
          apiKey: '',
          secret: '',
          sandbox: false
        },
        'spot'
      );
      const hasCapabilities = exchangeInstance.has || {};

      console.log(`🔍 [CCXTBrowser] Analyzing ${exchange} static capabilities`);

      const availableMarkets: string[] = [];

      if (hasCapabilities.spot === true) {
        availableMarkets.push('spot');
        console.log(`✅ [CCXTBrowser] ${exchange} supports spot trading`);
      }

      if (hasCapabilities.margin === true) {
        availableMarkets.push('margin');
        console.log(`✅ [CCXTBrowser] ${exchange} supports margin trading`);
      }

      if (hasCapabilities.swap === true) {
        availableMarkets.push('swap');
        console.log(`✅ [CCXTBrowser] ${exchange} supports swap trading`);
      }

      if (hasCapabilities.future === true) {
        availableMarkets.push('futures');
        console.log(`✅ [CCXTBrowser] ${exchange} supports futures trading`);
      }

      if (hasCapabilities.option === true) {
        availableMarkets.push('options');
        console.log(`✅ [CCXTBrowser] ${exchange} supports options trading`);
      }

      // Дополнительные проверки через API capabilities
      if (!availableMarkets.includes('futures') && (
        hasCapabilities.fetchFuturesBalance ||
        hasCapabilities.fetchDerivativesMarkets ||
        hasCapabilities.fetchPositions ||
        hasCapabilities.fetchPosition
      )) {
        availableMarkets.push('futures');
        console.log(`✅ [CCXTBrowser] ${exchange} supports futures (detected via API methods)`);
      }

      if (!availableMarkets.includes('margin') && (
        hasCapabilities.fetchMarginBalance ||
        hasCapabilities.fetchBorrowRate ||
        hasCapabilities.fetchBorrowRates
      )) {
        availableMarkets.push('margin');
        console.log(`✅ [CCXTBrowser] ${exchange} supports margin (detected via API methods)`);
      }

      console.log(`✅ [CCXTBrowser] Final markets for ${exchange}:`, {
        total: availableMarkets.length,
        markets: availableMarkets
      });

      return availableMarkets;
    } catch (error) {
      console.error(`❌ [CCXTBrowser] Error getting markets for exchange: ${exchange}`, error);
      return [];
    }
  }

  /**
   * Инвалидирует кэш для конкретного пользователя/аккаунта
   */
  static invalidateCache(providerId?: string, userId?: string, accountId?: string, exchangeId?: string): void {
    console.log(`🗑️ [CCXTBrowser] Delegating cache invalidation to ccxtInstanceManager`);
    if (exchangeId) {
      ccxtInstanceManager.invalidate(exchangeId, accountId);
    } else {
      // Если не указана конкретная биржа, очищаем весь кэш
      ccxtInstanceManager.clearCache();
    }
  }

  /**
   * Очищает весь кэш
   */
  static clearCache(): void {
    console.log(`🧹 [CCXTBrowser] Delegating cache clearing to ccxtInstanceManager`);
    ccxtInstanceManager.clearCache();
  }

  /**
   * Получает статистику кэша
   */
  static getCacheStats() {
    console.log(`📊 [CCXTBrowser] Delegating cache stats to ccxtInstanceManager`);
    return ccxtInstanceManager.getStats();
  }

  /**
   * Автоматическая очистка устаревших записей
   */
  static cleanup(): void {
    console.log(`🧽 [CCXTBrowser] Delegating cleanup to ccxtInstanceManager`);
    ccxtInstanceManager.cleanup();
  }
}

export const createCCXTBrowserProvider = (provider: CCXTBrowserProvider): CCXTBrowserProviderImpl => {
  return new CCXTBrowserProviderImpl(provider);
};

// Cleanup теперь управляется централизованно через ccxtInstanceManager 