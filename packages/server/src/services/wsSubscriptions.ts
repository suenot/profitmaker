import type { CCXTInstanceConfig } from './ccxtCache';
import type { ServerProviderInstance, ServerWatchDataType } from '@profitmaker/types';
import { providerRegistry } from '../providers';

export interface WebSocketSubscription {
  id: string;
  socketId: string;
  exchangeId: string;
  symbol: string;
  dataType: ServerWatchDataType;
  timeframe?: string;
  config: CCXTInstanceConfig;
  /** Optional explicit provider; omitted ⇒ registry picks by priority. */
  providerId?: string;
  isActive: boolean;
  providerInstance?: ServerProviderInstance;
}

const activeSubscriptions = new Map<string, WebSocketSubscription>();
const socketSubscriptions = new Map<string, Set<string>>();

export const createSubscriptionKey = (exchangeId: string, symbol: string, dataType: string, timeframe?: string): string => {
  const parts = [exchangeId, symbol, dataType];
  if (timeframe) parts.push(timeframe);
  return parts.join(':');
};

export const startWebSocketSubscription = async (
  subscription: WebSocketSubscription,
  emitData: (socketId: string, data: any) => void,
  emitError: (socketId: string, data: any) => void
): Promise<void> => {
  // Resolve through the provider registry so module-supplied providers serve
  // streaming too; defaults to the built-in 'ccxt' (zero behavior change).
  const { instance } = await providerRegistry.resolve(subscription.config, subscription.providerId);
  subscription.providerInstance = instance;

  const watchData = async () => {
    try {
      const data = await instance.watch(subscription.dataType, subscription.symbol, subscription.timeframe);

      emitData(subscription.socketId, {
        subscriptionId: subscription.id,
        dataType: subscription.dataType,
        exchange: subscription.exchangeId,
        symbol: subscription.symbol,
        timeframe: subscription.timeframe,
        data,
        timestamp: Date.now(),
      });

      if (subscription.isActive) setTimeout(watchData, 0);
    } catch (error) {
      emitError(subscription.socketId, {
        subscriptionId: subscription.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      if (subscription.isActive) setTimeout(watchData, 5000);
    }
  };

  watchData();
};

export const stopWebSocketSubscription = (subscriptionId: string): void => {
  const subscription = activeSubscriptions.get(subscriptionId);
  if (subscription) {
    subscription.isActive = false;
    activeSubscriptions.delete(subscriptionId);
  }
};

export const addSubscription = (subscription: WebSocketSubscription): void => {
  activeSubscriptions.set(subscription.id, subscription);
  if (!socketSubscriptions.has(subscription.socketId)) {
    socketSubscriptions.set(subscription.socketId, new Set());
  }
  socketSubscriptions.get(subscription.socketId)!.add(subscription.id);
};

export const removeSocketSubscriptions = (socketId: string): void => {
  const subs = socketSubscriptions.get(socketId);
  if (subs) {
    for (const subId of subs) stopWebSocketSubscription(subId);
    socketSubscriptions.delete(socketId);
  }
};

export const hasSubscription = (subscriptionId: string): boolean => {
  return activeSubscriptions.has(subscriptionId);
};

export const removeSubscriptionFromSocket = (socketId: string, subscriptionId: string): void => {
  stopWebSocketSubscription(subscriptionId);
  socketSubscriptions.get(socketId)?.delete(subscriptionId);
};
