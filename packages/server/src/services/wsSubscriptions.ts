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

const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 60_000;

/**
 * Failures that will never succeed on a retry. Matched by error NAME rather
 * than `instanceof` so this stays provider-agnostic — a module-supplied
 * provider is not obliged to throw ccxt's error classes (ccxt sets `.name` to
 * the class name on every BaseError subclass).
 */
const NON_RETRYABLE_ERRORS = new Set([
  'NotSupported',
  'AuthenticationError',
  'PermissionDenied',
  'BadSymbol',
  'ArgumentsRequired',
]);

const isNonRetryable = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  if (NON_RETRYABLE_ERRORS.has(error.name)) return true;
  // Providers that wrap capability checks in a plain Error (e.g. the built-in
  // ccxt provider's "<exchange> does not support watchX") are permanent too.
  return /does not support|not supported/i.test(error.message);
};

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

  let retryDelay = RETRY_BASE_MS;

  const watchData = async () => {
    if (!subscription.isActive) return;

    try {
      const data = await instance.watch(subscription.dataType, subscription.symbol, subscription.timeframe);

      // The subscription can be torn down while the watch promise is pending;
      // don't emit into a socket that has already unsubscribed or disconnected.
      if (!subscription.isActive) return;
      retryDelay = RETRY_BASE_MS; // a healthy payload resets the backoff

      emitData(subscription.socketId, {
        subscriptionId: subscription.id,
        dataType: subscription.dataType,
        exchange: subscription.exchangeId,
        symbol: subscription.symbol,
        timeframe: subscription.timeframe,
        data,
        timestamp: Date.now(),
      });

      setTimeout(watchData, 0);
    } catch (error) {
      if (!subscription.isActive) return;
      const message = error instanceof Error ? error.message : 'Unknown error';

      // Permanent failure: retrying forever would hammer the exchange (and can
      // earn an IP ban) for a stream that can never start. Tear it down and
      // tell the client the subscription is dead rather than merely stalled.
      if (isNonRetryable(error)) {
        stopWebSocketSubscription(subscription.id);
        emitError(subscription.socketId, {
          subscriptionId: subscription.id,
          error: message,
          fatal: true,
        });
        return;
      }

      emitError(subscription.socketId, {
        subscriptionId: subscription.id,
        error: message,
        fatal: false,
        retryInMs: retryDelay,
      });

      setTimeout(watchData, retryDelay);
      retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
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
  // Ownership check FIRST. Without it, naming another client's subscription id
  // was enough to stop that client's stream — the stop ran before the (purely
  // cosmetic) per-socket set delete.
  const subscription = activeSubscriptions.get(subscriptionId);
  if (!subscription || subscription.socketId !== socketId) return;

  stopWebSocketSubscription(subscriptionId);
  socketSubscriptions.get(socketId)?.delete(subscriptionId);
};
