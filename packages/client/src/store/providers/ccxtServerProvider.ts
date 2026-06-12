import type {
  CCXTServerProvider,
  Candle,
  Trade,
  OrderBook,
  Ticker,
  ExchangeBalances,
  MarketType,
  Timeframe,
} from '../../types/dataProviders';
import type {
  MarketDataProvider,
  ProviderInfo,
  ProviderHealth,
  ExchangeCapabilities,
  ProviderTrading,
  SubscriptionId,
  FetchCandlesParams,
  FetchTradesParams,
  FetchOrderBookParams,
  FetchTickerParams,
  WatchParams,
  CreateOrderParams,
} from '@profitmaker/types';
import {
  createCCXTInstanceConfig,
  type CCXTInstanceConfig
} from '../utils/ccxtProviderUtils';
import { io, Socket } from 'socket.io-client';

interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

export function deriveSocketUrl(serverUrl: string): string {
  try {
    const url = new URL(serverUrl);
    if (url.port) {
      url.port = String(Number(url.port) + 1);
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return serverUrl.replace(/\/$/, '');
  }
}

/**
 * CCXT Server Provider Implementation
 * Взаимодействует с Express сервером для выполнения CCXT операций
 * Основная цель: обход CORS ограничений браузера при работе с биржами
 */
export class CCXTServerProviderImpl implements MarketDataProvider {
  private provider: CCXTServerProvider;
  private baseUrl: string;
  private socketUrl: string;
  private token?: string;
  private timeout: number;
  private socket?: Socket;
  private subscriptions = new Map<string, any>();

  constructor(provider: CCXTServerProvider) {
    this.provider = provider;
    this.baseUrl = provider.config.serverUrl.replace(/\/$/, ''); // Remove trailing slash
    this.socketUrl = (provider.config.socketUrl || deriveSocketUrl(provider.config.serverUrl)).replace(/\/$/, '');
    this.token = provider.config.token;
    this.timeout = provider.config.timeout || 30000;
  }

  get info(): ProviderInfo {
    return {
      id: this.provider.id,
      name: this.provider.name,
      type: this.provider.type,
      exchanges: this.provider.exchanges,
    };
  }

  /**
   * Выполняет HTTP запрос к серверу
   */
  private async makeRequest<T = any>(endpoint: string, data: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    console.log(`🌐 [CCXTServer] Making request to ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Server error ${response.status}: ${errorData.error || response.statusText}`);
      }

      const result: ServerResponse<T> = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Server request failed');
      }

      return result.data as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Выполняет HTTP запрос через прокси сервера для обхода CORS
   */
  async makeProxyRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any): Promise<any> {
    console.log(`🌐 [CCXTServer] Proxying ${method} ${url}`);

    try {
      const response = await this.makeRequest('/api/proxy/request', {
        url,
        method,
        headers,
        body,
        timeout: this.timeout
      });

      return response;
    } catch (error) {
      console.error(`❌ [CCXTServer] Proxy request failed:`, error);
      throw error;
    }
  }

  /**
   * Устанавливает WebSocket соединение с сервером
   */
  private async connectWebSocket(): Promise<Socket> {
    if (this.socket && this.socket.connected) {
      return this.socket;
    }

    console.log(`🔌 [CCXTServer] Connecting to WebSocket: ${this.socketUrl}`);

    this.socket = io(this.socketUrl, {
      transports: ['websocket'],
      timeout: this.timeout,
    });

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Failed to create socket'));
        return;
      }

      this.socket.on('connect', () => {
        console.log(`✅ [CCXTServer] WebSocket connected`);

        // Authenticate
        if (this.token) {
          this.socket!.emit('authenticate', { token: this.token });
        } else {
          resolve(this.socket!);
        }
      });

      this.socket.on('authenticated', () => {
        console.log(`🔐 [CCXTServer] WebSocket authenticated`);
        resolve(this.socket!);
      });

      this.socket.on('auth_error', (error) => {
        console.error(`❌ [CCXTServer] WebSocket auth error:`, error);
        reject(new Error(`Authentication failed: ${error.error}`));
      });

      this.socket.on('connect_error', (error) => {
        console.error(`❌ [CCXTServer] WebSocket connection error:`, error);
        reject(error);
      });

      this.socket.on('disconnect', () => {
        console.log(`🔌 [CCXTServer] WebSocket disconnected`);
      });

      // Set connection timeout
      setTimeout(() => {
        if (!this.socket?.connected) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, this.timeout);
    });
  }

  /**
   * Подписывается на WebSocket данные
   */
  async subscribeWebSocket(
    exchangeId: string,
    symbol: string,
    dataType: 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance',
    config: CCXTInstanceConfig,
    onData: (data: any) => void,
    onError: (error: any) => void,
    timeframe?: string
  ): Promise<string> {
    const socket = await this.connectWebSocket();

    const subscriptionKey = `${exchangeId}:${symbol}:${dataType}${timeframe ? `:${timeframe}` : ''}`;

    // Set up data handler
    const dataHandler = (data: any) => {
      if (data.subscriptionId && data.subscriptionId.includes(subscriptionKey)) {
        onData(data);
      }
    };

    const errorHandler = (error: any) => {
      if (error.subscriptionId && error.subscriptionId.includes(subscriptionKey)) {
        onError(error);
      }
    };

    socket.on('data', dataHandler);
    socket.on('error', errorHandler);

    // Store handlers for cleanup
    this.subscriptions.set(subscriptionKey, {
      dataHandler,
      errorHandler,
      socket
    });

    // Send subscription request
    socket.emit('subscribe', {
      exchangeId,
      symbol,
      dataType,
      timeframe,
      config
    });

    return new Promise((resolve, reject) => {
      const subscriptionHandler = (data: any) => {
        if (data.exchangeId === exchangeId && data.symbol === symbol && data.dataType === dataType) {
          socket.off('subscribed', subscriptionHandler);
          socket.off('subscription_error', errorHandler);
          resolve(data.subscriptionId);
        }
      };

      const subscriptionErrorHandler = (error: any) => {
        socket.off('subscribed', subscriptionHandler);
        socket.off('subscription_error', subscriptionErrorHandler);
        reject(new Error(error.error));
      };

      socket.on('subscribed', subscriptionHandler);
      socket.on('subscription_error', subscriptionErrorHandler);
    });
  }

  /**
   * Отписывается от WebSocket данных
   */
  async unsubscribeWebSocket(subscriptionKey: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionKey);
    if (!subscription) {
      return;
    }

    const { dataHandler, errorHandler, socket } = subscription;

    // Remove event listeners
    socket.off('data', dataHandler);
    socket.off('error', errorHandler);

    // Send unsubscribe request
    socket.emit('unsubscribe', { subscriptionId: subscriptionKey });

    // Remove from subscriptions
    this.subscriptions.delete(subscriptionKey);

    console.log(`📡 [CCXTServer] Unsubscribed from ${subscriptionKey}`);
  }

  /**
   * Закрывает WebSocket соединение
   */
  async disconnectWebSocket(): Promise<void> {
    if (this.socket) {
      // Unsubscribe from all
      for (const subscriptionKey of this.subscriptions.keys()) {
        await this.unsubscribeWebSocket(subscriptionKey);
      }

      this.socket.disconnect();
      this.socket = undefined;
      console.log(`🔌 [CCXTServer] WebSocket disconnected`);
    }
  }

  /**
   * Создает конфигурацию для CCXT instance
   */
  private createInstanceConfig(
    userId: string,
    accountId: string,
    exchangeId: string,
    marketType: string,
    ccxtType: 'regular' | 'pro',
    credentials?: {
      apiKey?: string;
      secret?: string;
      password?: string;
      sandbox?: boolean;
    }
  ): CCXTInstanceConfig {
    return createCCXTInstanceConfig(
      this.provider.id,
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      credentials
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
    const config = this.createInstanceConfig(
      userId,
      accountId,
      exchangeId,
      marketType,
      ccxtType,
      credentials
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] Trading instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Получает CCXT instance для получения метаданных (без API ключей)
   */
  async getMetadataInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = this.createInstanceConfig(
      'metadata',
      'public',
      exchangeId,
      marketType,
      'regular', // Для метаданных всегда используем regular
      { sandbox }
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] Metadata instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Получает CCXT Pro instance для WebSocket подписок (без API ключей)
   */
  async getWebSocketInstance(
    exchangeId: string,
    marketType: string = 'spot',
    sandbox: boolean = false
  ): Promise<any> {
    const config = this.createInstanceConfig(
      'websocket',
      'public',
      exchangeId,
      marketType,
      'pro', // Для WebSocket используем pro
      { sandbox }
    );

    // Создаем instance на сервере
    await this.makeRequest('/api/exchange/instance', config);
    
    console.log(`✅ [CCXTServer] WebSocket instance created for ${exchangeId}`);
    
    // Возвращаем proxy объект для взаимодействия с сервером
    return this.createExchangeProxy(config);
  }

  /**
   * Создает proxy объект для взаимодействия с exchange instance на сервере
   */
  private createExchangeProxy(config: CCXTInstanceConfig): any {
    const self = this;

    return {
      // REST API методы
      async fetchTicker(symbol: string) {
        return self.makeRequest('/api/exchange/fetchTicker', { config, symbol });
      },

      async fetchOrderBook(symbol: string, limit?: number) {
        return self.makeRequest('/api/exchange/fetchOrderBook', { config, symbol, limit });
      },

      async fetchTrades(symbol: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchTrades', { config, symbol, since, limit });
      },

      async fetchOHLCV(symbol: string, timeframe: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchOHLCV', {
          config,
          symbol,
          timeframe,
          since,
          limit
        });
      },

      async fetchBalance() {
        return self.makeRequest('/api/exchange/fetchBalance', { config });
      },

      // WebSocket методы - настоящие WebSocket соединения
      async watchTicker(symbol: string, onData?: (data: any) => void, onError?: (error: any) => void): Promise<string> {
        if (!onData) {
          // Если нет callback, возвращаем одноразовые данные
          const response = await self.makeRequest('/api/exchange/watchTicker', { config, symbol });
          return response.data;
        }

        // Подписываемся на WebSocket поток
        return self.subscribeWebSocket(
          config.exchangeId,
          symbol,
          'ticker',
          config,
          onData,
          onError || console.error
        );
      },

      async watchOrderBook(symbol: string, limit?: number, onData?: (data: any) => void, onError?: (error: any) => void): Promise<string> {
        if (!onData) {
          const response = await self.makeRequest('/api/exchange/watchOrderBook', { config, symbol, limit });
          return response.data;
        }

        return self.subscribeWebSocket(
          config.exchangeId,
          symbol,
          'orderbook',
          config,
          onData,
          onError || console.error
        );
      },

      async watchTrades(symbol: string, onData?: (data: any) => void, onError?: (error: any) => void): Promise<string> {
        if (!onData) {
          const response = await self.makeRequest('/api/exchange/watchTrades', { config, symbol });
          return response.data;
        }

        return self.subscribeWebSocket(
          config.exchangeId,
          symbol,
          'trades',
          config,
          onData,
          onError || console.error
        );
      },

      async watchOHLCV(symbol: string, timeframe: string, onData?: (data: any) => void, onError?: (error: any) => void): Promise<string> {
        if (!onData) {
          const response = await self.makeRequest('/api/exchange/watchOHLCV', { config, symbol, timeframe });
          return response.data;
        }

        return self.subscribeWebSocket(
          config.exchangeId,
          symbol,
          'ohlcv',
          config,
          onData,
          onError || console.error,
          timeframe
        );
      },

      async watchBalance(onData?: (data: any) => void, onError?: (error: any) => void): Promise<string> {
        if (!onData) {
          const response = await self.makeRequest('/api/exchange/watchBalance', { config });
          return response.data;
        }

        return self.subscribeWebSocket(
          config.exchangeId,
          '', // No symbol for balance
          'balance',
          config,
          onData,
          onError || console.error
        );
      },

      // Управление подписками
      async unsubscribe(subscriptionId: string): Promise<void> {
        return self.unsubscribeWebSocket(subscriptionId);
      },

      async disconnect(): Promise<void> {
        return self.disconnectWebSocket();
      },

      // Получение capabilities
      async getCapabilities() {
        return self.makeRequest('/api/exchange/capabilities', { config });
      },

      // Прямые HTTP запросы для обхода CORS (основная функция server provider)
      async httpRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}, body?: any) {
        return self.makeProxyRequest(url, method, headers, body);
      },

      // Метод для выполнения произвольных запросов к бирже через прокси
      async fetch(url: string, options: any = {}) {
        const { method = 'GET', headers = {}, body } = options;
        return self.makeProxyRequest(url, method, headers, body);
      },

      // Свойства для совместимости с CCXT
      get has() {
        return {
          fetchTicker: true,
          fetchOrderBook: true,
          fetchTrades: true,
          fetchOHLCV: true,
          fetchBalance: config.apiKey ? true : false,
          watchTicker: config.ccxtType === 'pro',
          watchOrderBook: config.ccxtType === 'pro',
          watchTrades: config.ccxtType === 'pro',
          watchOHLCV: config.ccxtType === 'pro',
          watchBalance: config.ccxtType === 'pro' && config.apiKey ? true : false,
        };
      },

      // Метаданные
      id: config.exchangeId,
      name: config.exchangeId,
      sandbox: config.sandbox || false,
    };
  }

  /**
   * Проверяет доступность сервера
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error) {
      console.error(`❌ [CCXTServer] Health check failed:`, error);
      return false;
    }
  }

  // ===========================================================================
  // MarketDataProvider contract
  // ===========================================================================

  async healthCheck(): Promise<ProviderHealth> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        return { ok: false, error: `Health endpoint returned ${response.status}` };
      }
      const body = await response.json().catch(() => ({}));
      return {
        ok: body.status === 'ok' || body.status === undefined,
        version: body.version,
        ccxtVersion: body.ccxtVersion,
        socketPort: body.socketPort,
        uptime: body.uptime,
        db: body.db,
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async listExchanges(): Promise<string[]> {
    const url = `${this.baseUrl}/api/exchange/list`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    const response = await fetch(url, { method: 'GET', headers });
    if (!response.ok) {
      throw new Error(`Failed to list exchanges: ${response.status}`);
    }
    const result = await response.json();
    return (result.data ?? result.exchanges ?? []) as string[];
  }

  async getCapabilities(exchange: string, market: MarketType = 'spot'): Promise<ExchangeCapabilities> {
    const instance = await this.getMetadataInstance(exchange, market);
    const caps = await instance.getCapabilities();
    const data = caps?.data ?? caps ?? {};
    return {
      has: data.has ?? {},
      symbols: data.symbols ?? [],
      markets: data.markets ?? [],
      timeframes: Array.isArray(data.timeframes) ? data.timeframes : Object.keys(data.timeframes ?? {}),
      fees: data.fees,
    };
  }

  async getSymbols(exchange: string, market: MarketType = 'spot', limit?: number): Promise<string[]> {
    const caps = await this.getCapabilities(exchange, market);
    const symbols = caps.symbols ?? [];
    return limit && limit > 0 ? symbols.slice(0, limit) : symbols;
  }

  async getMarkets(exchange: string): Promise<string[]> {
    const caps = await this.getCapabilities(exchange);
    const has = caps.has ?? {};
    const markets: string[] = [];
    if (has.spot) markets.push('spot');
    if (has.margin) markets.push('margin');
    if (has.swap || has.future) markets.push('futures');
    if (has.option) markets.push('options');
    return markets.length > 0 ? markets : ['spot'];
  }

  async getTimeframes(exchange: string): Promise<Timeframe[]> {
    const caps = await this.getCapabilities(exchange);
    const valid: Timeframe[] = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M'];
    const set = new Set(caps.timeframes ?? []);
    const result = valid.filter((tf) => set.has(tf));
    return result.length > 0 ? result : ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
  }

  async fetchCandles(params: FetchCandlesParams): Promise<Candle[]> {
    const instance = await this.getMetadataInstance(params.exchange, params.market ?? 'spot');
    const ohlcv = await instance.fetchOHLCV(params.symbol, params.timeframe ?? '1m', params.since, params.limit);
    return (ohlcv ?? []).map((c: any[]) => ({
      timestamp: c[0], open: c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
    }));
  }

  async fetchTrades(params: FetchTradesParams): Promise<Trade[]> {
    const instance = await this.getMetadataInstance(params.exchange, params.market ?? 'spot');
    const trades = await instance.fetchTrades(params.symbol, params.since, params.limit);
    return (trades ?? []) as Trade[];
  }

  async fetchOrderBook(params: FetchOrderBookParams): Promise<OrderBook> {
    const instance = await this.getMetadataInstance(params.exchange, params.market ?? 'spot');
    return (await instance.fetchOrderBook(params.symbol, params.limit)) as OrderBook;
  }

  async fetchTicker(params: FetchTickerParams): Promise<Ticker> {
    const instance = await this.getMetadataInstance(params.exchange, params.market ?? 'spot');
    const t: any = await instance.fetchTicker(params.symbol);
    return {
      symbol: t.symbol,
      timestamp: t.timestamp ?? Date.now(),
      bid: t.bid ?? 0,
      ask: t.ask ?? 0,
      last: t.last,
      close: t.close,
      midPrice: t.bid && t.ask ? (t.bid + t.ask) / 2 : undefined,
    };
  }

  async fetchBalance(accountId: string, walletType: string = 'spot'): Promise<ExchangeBalances> {
    // Authenticated balance is fetched via the trading instance; credentials are
    // resolved by the caller (store) and passed to getTradingInstance separately.
    // This thin path requires a pre-created instance for accountId; callers that
    // need credentials use the trading block instead.
    throw new Error(`fetchBalance requires credentials; use trading.fetchBalance via the store (account ${accountId}, ${walletType})`);
  }

  async watch(
    params: WatchParams,
    onData: (data: any) => void,
    onError?: (error: any) => void,
  ): Promise<SubscriptionId> {
    const dataTypeMap: Record<string, 'ticker' | 'trades' | 'orderbook' | 'ohlcv' | 'balance'> = {
      candles: 'ohlcv', trades: 'trades', orderbook: 'orderbook', ticker: 'ticker', balance: 'balance',
    };
    const wsType = dataTypeMap[params.dataType];
    const config = this.createInstanceConfig('websocket', 'public', params.exchange, params.market ?? 'spot', 'pro');
    return this.subscribeWebSocket(
      params.exchange,
      params.symbol,
      wsType,
      config,
      onData,
      onError ?? console.error,
      params.timeframe,
    );
  }

  async unsubscribe(subscriptionId: SubscriptionId): Promise<void> {
    return this.unsubscribeWebSocket(subscriptionId);
  }

  async dispose(): Promise<void> {
    return this.disconnectWebSocket();
  }

  get trading(): ProviderTrading {
    const self = this;
    return {
      async createOrder(accountId: string, params: CreateOrderParams) {
        return self.makeRequest('/api/exchange/createOrder', {
          accountId,
          exchangeId: params.exchange,
          symbol: params.symbol,
          type: params.type,
          side: params.side,
          amount: params.amount,
          price: params.price,
          marketType: params.market ?? 'spot',
          params: params.params ?? {},
        });
      },
      async cancelOrder(accountId: string, orderId: string, symbol: string, market: MarketType = 'spot') {
        return self.makeRequest('/api/exchange/cancelOrder', {
          accountId, orderId, symbol, marketType: market,
        });
      },
      async fetchMyTrades(accountId: string, symbol?: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchMyTrades', { accountId, symbol, since, limit });
      },
      async fetchOrders(accountId: string, symbol?: string, since?: number, limit?: number) {
        return self.makeRequest('/api/exchange/fetchOrders', { accountId, symbol, since, limit });
      },
      async fetchOpenOrders(accountId: string, symbol?: string) {
        return self.makeRequest('/api/exchange/fetchOpenOrders', { accountId, symbol });
      },
      async fetchPositions(accountId: string, symbols?: string[]) {
        return self.makeRequest('/api/exchange/fetchPositions', { accountId, symbols });
      },
    };
  }
}

export const createCCXTServerProvider = (provider: CCXTServerProvider): CCXTServerProviderImpl => {
  return new CCXTServerProviderImpl(provider);
};
