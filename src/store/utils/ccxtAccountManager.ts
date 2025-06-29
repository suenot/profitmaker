import { getCCXT, getCCXTPro } from './ccxtUtils';
import { wrapExchangeWithLogger } from '../../utils/requestLogger';

interface AccountExchangeConfig {
  accountId: string;
  exchange: string;
  apiKey: string;
  secret: string;
  password?: string;
  sandbox: boolean;
}

interface ExchangeInstanceCache {
  // Regular CCXT instances by market type
  regular: Map<string, {
    instance: any;
    lastAccess: number;
    marketsLoaded: boolean;
  }>;
  // CCXT Pro instances (WebSocket support)
  pro?: {
    instance: any;
    lastAccess: number;
    marketsLoaded: boolean;
  };
}

interface MarketsCache {
  [cacheKey: string]: {
    markets: any;
    timestamp: number;
  };
}

/**
 * Менеджер CCXT instances для аккаунтов
 * Управляет как обычными CCXT, так и CCXT Pro instances
 * Группирует instances по аккаунтам и типам рынков
 */
class CCXTAccountManager {
  // [accountId:exchange] -> ExchangeInstanceCache
  private accountsCache = new Map<string, ExchangeInstanceCache>();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 1 день
  private marketsCache: MarketsCache = {};
  private readonly MARKETS_CACHE_TTL = 60 * 60 * 1000; // 1 час для markets

  /**
   * Создает ключ для аккаунта
   */
  private createAccountKey(accountId: string, exchange: string): string {
    return `${accountId}:${exchange}`;
  }

  /**
   * Создает ключ для кэша markets
   */
  private createMarketsCacheKey(exchange: string, sandbox: boolean, marketType: string): string {
    return `${exchange}:${sandbox ? 'sandbox' : 'live'}:${marketType}`;
  }

  /**
   * Проверяет валидность кэшированного instance
   */
  private isInstanceValid(cached: { lastAccess: number }): boolean {
    const now = Date.now();
    return (now - cached.lastAccess) < this.CACHE_TTL;
  }

  /**
   * Проверяет валидность кэшированных markets
   */
  private isMarketsValid(cacheKey: string): boolean {
    const cached = this.marketsCache[cacheKey];
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < this.MARKETS_CACHE_TTL;
  }

  /**
   * Загружает markets с кэшированием
   */
  private async loadMarketsWithCache(exchangeInstance: any, exchange: string, sandbox: boolean, marketType: string): Promise<void> {
    const cacheKey = this.createMarketsCacheKey(exchange, sandbox, marketType);
    
    // Проверяем кэш markets
    if (this.isMarketsValid(cacheKey)) {
      console.log(`📋 [CCXTAccountManager] Using cached markets for ${cacheKey}`);
      exchangeInstance.markets = this.marketsCache[cacheKey].markets;
      return;
    }

    console.log(`🔄 [CCXTAccountManager] Loading fresh markets for ${cacheKey}`);
    await exchangeInstance.loadMarkets();
    
    // Кэшируем markets
    this.marketsCache[cacheKey] = {
      markets: exchangeInstance.markets,
      timestamp: Date.now()
    };
    
    console.log(`✅ [CCXTAccountManager] Cached markets for ${cacheKey}`);
  }

  /**
   * Получает или создает обычный CCXT instance для конкретного типа рынка
   */
  async getRegularInstance(config: AccountExchangeConfig, marketType: string = 'spot'): Promise<any> {
    const accountKey = this.createAccountKey(config.accountId, config.exchange);
    
    // Получаем или создаем кэш для аккаунта
    if (!this.accountsCache.has(accountKey)) {
      this.accountsCache.set(accountKey, {
        regular: new Map()
      });
    }
    
    const accountCache = this.accountsCache.get(accountKey)!;
    const cachedInstance = accountCache.regular.get(marketType);

    // Проверяем кэш
    if (cachedInstance && this.isInstanceValid(cachedInstance)) {
      cachedInstance.lastAccess = Date.now();
      console.log(`📋 [CCXTAccountManager] Using cached regular instance: ${accountKey}:${marketType}`);
      return cachedInstance.instance;
    }

    // Создаем новый instance
    console.log(`🔄 [CCXTAccountManager] Creating new regular instance: ${accountKey}:${marketType}`);
    
    const ccxt = getCCXT();
    if (!ccxt) {
      throw new Error('CCXT not available');
    }

    const ExchangeClass = ccxt[config.exchange];
    if (!ExchangeClass) {
      throw new Error(`Exchange ${config.exchange} not found in CCXT`);
    }

    // Маппинг типов рынков для разных бирж
    let defaultType = marketType;
    if (config.exchange === 'bybit') {
      const bybitCategoryMap: Record<string, string> = {
        'spot': 'spot',
        'futures': 'linear',
        'swap': 'linear', 
        'margin': 'spot',
        'options': 'option'
      };
      defaultType = bybitCategoryMap[marketType] || marketType;
      console.log(`🔍 [CCXTAccountManager] Bybit mapping: ${marketType} -> ${defaultType}`);
    }

    const instanceConfig: any = {
      sandbox: config.sandbox,
      apiKey: config.apiKey,
      secret: config.secret,
      password: config.password,
      enableRateLimit: true,
      defaultType: defaultType,
    };
    
    // Добавляем CORS proxy для бирж, которые его требуют
    if (config.exchange === 'bingx') {
      // Для BingX используем локальный CORS proxy
      instanceConfig.urls = {
        api: {
          public: 'http://localhost:3001/bingx',
          private: 'http://localhost:3001/bingx'
        }
      };
      console.log(`🔄 [CCXTAccountManager] Using local CORS proxy for BingX: http://localhost:3001/bingx`);
    } else if (config.exchange === 'bybit') {
      // Для Bybit тоже можно использовать прокси если будут проблемы
      instanceConfig.urls = {
        api: {
          public: 'http://localhost:3001/bybit',
          private: 'http://localhost:3001/bybit'
        }
      };
      console.log(`🔄 [CCXTAccountManager] Using local CORS proxy for Bybit: http://localhost:3001/bybit`);
    } else if (['bitget', 'mexc', 'kucoin', 'huobi', 'gateio'].includes(config.exchange)) {
      // Для других бирж с CORS проблемами
      instanceConfig.urls = {
        api: {
          public: `http://localhost:3001/exchange/${config.exchange}`,
          private: `http://localhost:3001/exchange/${config.exchange}`
        }
      };
      console.log(`🔄 [CCXTAccountManager] Using local CORS proxy for ${config.exchange}: http://localhost:3001/exchange/${config.exchange}`);
    }
    
    console.log(`🔍 [CCXTAccountManager] Creating ${config.exchange} regular instance:`, {
      accountId: config.accountId,
      sandbox: instanceConfig.sandbox,
      apiKey: instanceConfig.apiKey ? 'SET' : 'NOT_SET',
      secret: instanceConfig.secret ? 'SET' : 'NOT_SET',
      defaultType: instanceConfig.defaultType,
      marketType,
              proxyUrls: instanceConfig.urls ? JSON.stringify(instanceConfig.urls.api) : 'NONE'
    });
    
    const exchangeInstance = new ExchangeClass(instanceConfig);

    // Wrap with request logger
    const loggedInstance = wrapExchangeWithLogger(exchangeInstance, config.exchange, config.accountId);

    // Загружаем markets с кэшированием
    await this.loadMarketsWithCache(loggedInstance, config.exchange, config.sandbox, marketType);

    // Кэшируем instance
    accountCache.regular.set(marketType, {
      instance: loggedInstance,
      lastAccess: Date.now(),
      marketsLoaded: true
    });

    console.log(`✅ [CCXTAccountManager] Cached regular instance: ${accountKey}:${marketType}`);
    return loggedInstance;
  }

  /**
   * Получает CCXT Pro instance для конкретного аккаунта и биржи
   */
  async getProInstance(config: AccountExchangeConfig): Promise<any> {
    console.log(`📡 [CCXTAccountManager] Getting CCXT Pro instance for ${config.accountId}:${config.exchange}`);
    
    const ccxtPro = getCCXTPro();
    if (!ccxtPro) {
      console.warn(`⚠️ [CCXTAccountManager] CCXT Pro not available`);
      return null;
    }

    const accountKey = this.createAccountKey(config.accountId, config.exchange);
    
    // Получаем или создаем кэш для аккаунта
    if (!this.accountsCache.has(accountKey)) {
      this.accountsCache.set(accountKey, {
        regular: new Map()
      });
    }
    
    const accountCache = this.accountsCache.get(accountKey)!;

    // Проверяем кэш
    const now = Date.now();
    if (accountCache.pro && this.isInstanceValid(accountCache.pro)) {
      accountCache.pro.lastAccess = now;
      console.log(`📋 [CCXTAccountManager] Using cached CCXT Pro instance for ${accountKey}`);
      return accountCache.pro.instance;
    }

    // Создаем новый Pro instance
    console.log(`🔄 [CCXTAccountManager] Creating new CCXT Pro instance for ${accountKey}`);
    
    try {
      const ExchangeClass = ccxtPro[config.exchange];
      if (!ExchangeClass) {
        throw new Error(`Exchange ${config.exchange} not found in CCXT Pro`);
      }

      const instanceConfig = {
        sandbox: config.sandbox,
        apiKey: config.apiKey,
        secret: config.secret,
        password: config.password,
        enableRateLimit: true,
      };
      
      console.log(`🔍 [CCXTAccountManager] Creating CCXT Pro ${config.exchange} instance:`, {
        accountId: config.accountId,
        sandbox: instanceConfig.sandbox,
        apiKey: instanceConfig.apiKey ? 'SET' : 'NOT_SET',
        secret: instanceConfig.secret ? 'SET' : 'NOT_SET',
        enableRateLimit: instanceConfig.enableRateLimit
      });

      const exchangeInstance = new ExchangeClass(instanceConfig);

      // Wrap with request logger (for WS connections it might not capture all, but still useful)
      const loggedInstance = wrapExchangeWithLogger(exchangeInstance, config.exchange, config.accountId);

      // Загружаем markets с кэшированием (CCXT Pro тоже нуждается в markets)
      await this.loadMarketsWithCache(loggedInstance, config.exchange, config.sandbox, 'spot');

      accountCache.pro = {
        instance: loggedInstance,
        lastAccess: now,
        marketsLoaded: true
      };

      console.log(`✅ [CCXTAccountManager] Cached new CCXT Pro instance for ${accountKey}`);
      return loggedInstance;

    } catch (error) {
      console.error(`❌ [CCXTAccountManager] Failed to create CCXT Pro instance for ${accountKey}:`, error);
      return null;
    }
  }

  /**
   * Инвалидирует кэш для конкретного аккаунта
   */
  invalidateAccount(accountId: string, exchange?: string): void {
    if (exchange) {
      const accountKey = this.createAccountKey(accountId, exchange);
      this.accountsCache.delete(accountKey);
      console.log(`🗑️ [CCXTAccountManager] Invalidated cache for account: ${accountKey}`);
    } else {
      // Инвалидируем все exchanges для аккаунта
      const keysToDelete = Array.from(this.accountsCache.keys()).filter(key => 
        key.startsWith(`${accountId}:`)
      );
      keysToDelete.forEach(key => this.accountsCache.delete(key));
      console.log(`🗑️ [CCXTAccountManager] Invalidated cache for all exchanges of account: ${accountId}`);
    }
  }

  /**
   * Очищает весь кэш
   */
  clearCache(): void {
    this.accountsCache.clear();
    this.marketsCache = {};
    console.log(`🧹 [CCXTAccountManager] Cleared entire cache`);
  }

  /**
   * Очищает устаревшие записи
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.accountsCache.forEach((accountCache, accountKey) => {
      // Проверяем regular instances
      const regularKeysToDelete: string[] = [];
      accountCache.regular.forEach((cached, marketType) => {
        if (!this.isInstanceValid(cached)) {
          regularKeysToDelete.push(marketType);
        }
      });
      regularKeysToDelete.forEach(key => accountCache.regular.delete(key));

      // Проверяем Pro instance
      if (accountCache.pro && !this.isInstanceValid(accountCache.pro)) {
        accountCache.pro = undefined;
      }

      // Если у аккаунта нет активных instances, удаляем его
      if (accountCache.regular.size === 0 && !accountCache.pro) {
        keysToDelete.push(accountKey);
      }
    });

    keysToDelete.forEach(key => this.accountsCache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`🧽 [CCXTAccountManager] Cleaned up ${keysToDelete.length} expired account caches`);
    }
  }

  /**
   * Получает статистику кэша
   */
  getAccountStats() {
    const stats: Array<{
      accountId: string;
      exchange: string;
      regularInstances: Array<{
        marketType: string;
        lastAccess: number;
        age: number;
        marketsLoaded: boolean;
      }>;
      proInstance?: {
        lastAccess: number;
        age: number;
        marketsLoaded: boolean;
      };
    }> = [];

    this.accountsCache.forEach((accountCache, accountKey) => {
      const [accountId, exchange] = accountKey.split(':');
      const now = Date.now();
      
      const regularInstances: any[] = [];
      accountCache.regular.forEach((cached, marketType) => {
        regularInstances.push({
          marketType,
          lastAccess: cached.lastAccess,
          age: now - cached.lastAccess,
          marketsLoaded: cached.marketsLoaded
        });
      });

      const accountStat: any = {
        accountId,
        exchange,
        regularInstances
      };

      if (accountCache.pro) {
        accountStat.proInstance = {
          lastAccess: accountCache.pro.lastAccess,
          age: now - accountCache.pro.lastAccess,
          marketsLoaded: accountCache.pro.marketsLoaded
        };
      }

      stats.push(accountStat);
    });

    return {
      totalAccounts: this.accountsCache.size,
      totalRegularInstances: Array.from(this.accountsCache.values()).reduce(
        (sum, cache) => sum + cache.regular.size,
        0
      ),
      totalProInstances: Array.from(this.accountsCache.values()).filter(
        cache => cache.pro
      ).length,
      accounts: stats
    };
  }
}

// Singleton instance
export const ccxtAccountManager = new CCXTAccountManager();

// Автоматическая очистка каждые 10 минут
setInterval(() => {
  ccxtAccountManager.cleanup();
}, 10 * 60 * 1000); 