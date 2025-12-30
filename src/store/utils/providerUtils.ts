import type { DataProvider, ExchangeAccountForProvider, ProviderExchangeMapping, CCXTBrowserConfig, CCXTServerConfig, CCXTExchangeInstance, CCXTExchangeConfig } from '../../types/dataProviders';
import type { User, ExchangeAccount } from '../userStore';
import { useUserStore } from '../userStore';

/**
 * Создает CCXT exchange instance с пользовательскими ключами
 */
export const createExchangeInstance = (exchange: string, provider: DataProvider, ccxtLib: Record<string, new (config?: CCXTExchangeConfig) => CCXTExchangeInstance>): CCXTExchangeInstance => {
  if (!ccxtLib) {
    throw new Error('CCXT library not available');
  }

  const ExchangeClass = ccxtLib[exchange];
  if (!ExchangeClass) {
    throw new Error(`Exchange ${exchange} not found in CCXT`);
  }

  // Get user credentials for this exchange
  let activeUser: User | undefined;
  try {
    const userState = useUserStore.getState();
    activeUser = userState.users.find((u: User) => u.id === userState.activeUserId);
  } catch (error) {
    console.warn('Failed to get user store:', error);
    activeUser = undefined;
  }

  let config: CCXTExchangeConfig = {};

  if (provider.type === 'ccxt-browser') {
    const browserConfig = provider.config as CCXTBrowserConfig;
    config = {
      sandbox: browserConfig.sandbox || false,
      options: browserConfig.options || {}
    };

    // Add user credentials if available
    if (activeUser) {
      const account = getAccountForExchange(activeUser, exchange);
      if (account && account.key && account.privateKey) {
        const providerAccount = convertAccountForProvider(account);
        config.apiKey = providerAccount.apiKey;
        config.secret = providerAccount.secret;
        if (providerAccount.password) config.password = providerAccount.password;
        if (providerAccount.uid) config.uid = providerAccount.uid;
      }
    }
  } else if (provider.type === 'ccxt-server') {
    const serverConfig = provider.config as CCXTServerConfig;
    config = {
      serverUrl: serverConfig.serverUrl,
      timeout: serverConfig.timeout || 30000,
      sandbox: serverConfig.sandbox || false
    };

    // For server providers, credentials are managed on server side
  }

  return new ExchangeClass(config);
};

/**
 * Получает аккаунт пользователя для конкретной биржи
 */
export const getAccountForExchange = (user: User, exchange: string): ExchangeAccount | undefined => {
  return user.accounts.find(account => account.exchange === exchange);
};

/**
 * Конвертирует ExchangeAccount в ExchangeAccountForProvider
 */
export const convertAccountForProvider = (account: ExchangeAccount): ExchangeAccountForProvider => {
  return {
    exchange: account.exchange,
    apiKey: account.key,
    secret: account.privateKey,
    password: account.password,
    uid: account.uid,
    email: account.email
  };
};

/**
 * Проверяет, поддерживает ли провайдер конкретную биржу
 */
export const providerSupportsExchange = (provider: DataProvider, exchange: string): boolean => {
  // Если в массиве есть '*' - провайдер поддерживает все биржи
  if (provider.exchanges.includes('*')) {
    return true;
  }
  
  // Иначе проверяем конкретное вхождение
  return provider.exchanges.includes(exchange);
};

/**
 * Находит все провайдеры, поддерживающие конкретную биржу
 */
export const getProvidersForExchange = (providers: DataProvider[], exchange: string): DataProvider[] => {
  return providers.filter(provider => providerSupportsExchange(provider, exchange));
};

/**
 * Выбирает оптимальный провайдер для биржи с учетом приоритетов
 */
export const selectOptimalProvider = (providers: DataProvider[], exchange: string): DataProvider | null => {
  const supportingProviders = getProvidersForExchange(providers, exchange);
  
  if (supportingProviders.length === 0) {
    return null;
  }
  
  // Сортируем по приоритету (меньше = выше приоритет)
  const sortedProviders = supportingProviders.sort((a, b) => {
    // Сначала специализированные провайдеры (не содержат '*')
    const aIsSpecialized = !a.exchanges.includes('*');
    const bIsSpecialized = !b.exchanges.includes('*');
    
    if (aIsSpecialized && !bIsSpecialized) return -1;
    if (!aIsSpecialized && bIsSpecialized) return 1;
    
    // Если оба специализированные или оба универсальные - сравниваем по приоритету
    return a.priority - b.priority;
  });
  
  // Возвращаем первый активный провайдер
  return sortedProviders.find(provider => provider.status === 'connected') || sortedProviders[0];
};

/**
 * Создает mapping провайдеров для всех бирж из списка
 */
export const createProviderExchangeMappings = (
  providers: DataProvider[], 
  exchanges: string[], 
  activeUser: User | null
): ProviderExchangeMapping[] => {
  const mappings: ProviderExchangeMapping[] = [];
  
  for (const exchange of exchanges) {
    const provider = selectOptimalProvider(providers, exchange);
    
    if (provider) {
      const account = activeUser ? getAccountForExchange(activeUser, exchange) : undefined;
      
      mappings.push({
        exchange,
        provider,
        account: account ? convertAccountForProvider(account) : undefined
      });
    }
  }
  
  return mappings;
};

/**
 * Получает приоритет для нового провайдера (больше всех существующих + 10)
 */
export const getNextProviderPriority = (providers: DataProvider[]): number => {
  if (providers.length === 0) return 10;
  
  const maxPriority = Math.max(...providers.map(p => p.priority));
  return maxPriority + 10;
};

/**
 * Создает ID для провайдера на основе типа и бирж
 */
export const generateProviderId = (type: string, exchanges: string[], name?: string): string => {
  const exchangesPart = exchanges.includes('*') ? 'all' : exchanges.join('-');
  const timestamp = Date.now().toString(36);
  const namePart = name ? name.toLowerCase().replace(/\s+/g, '-') : type;
  
  return `${namePart}-${exchangesPart}-${timestamp}`;
};

/**
 * Валидирует конфигурацию провайдера
 */
export const validateProviderConfig = (provider: DataProvider): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Базовая валидация
  if (!provider.id) {
    errors.push('Provider ID is required');
  }
  
  if (!provider.name) {
    errors.push('Provider name is required');
  }
  
  if (!provider.exchanges || provider.exchanges.length === 0) {
    errors.push('Provider must support at least one exchange');
  }
  
  // Валидация для CCXT Server
  if (provider.type === 'ccxt-server') {
    const config = provider.config as CCXTServerConfig;
    if (!config.serverUrl) {
      errors.push('Server URL is required for CCXT Server provider');
    }
    try {
      new URL(config.serverUrl);
    } catch {
      errors.push('Server URL must be a valid URL');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Формирует отображаемое описание провайдера
 */
export const getProviderDisplayInfo = (provider: DataProvider): { title: string; subtitle: string; badgeText: string } => {
  const exchangesText = provider.exchanges.includes('*') 
    ? 'All exchanges' 
    : provider.exchanges.join(', ');
    
  const typeText = provider.type === 'ccxt-browser' 
    ? 'Browser' 
    : provider.type === 'ccxt-server' 
    ? 'Server' 
    : 'Custom';
    
  return {
    title: provider.name,
    subtitle: `${typeText} • ${exchangesText}`,
    badgeText: `Priority: ${provider.priority}`
  };
}; 