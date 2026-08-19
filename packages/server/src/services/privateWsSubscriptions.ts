import type {
  PrivateTradingCapabilities,
  PrivateTradingDataEvent,
  PrivateTradingDataType,
  PrivateTradingErrorEvent,
  PrivateTradingHeartbeat,
} from '@profitmaker/types';
import { fetchCredentials, invalidateCredentialCache } from './authAccounts';
import {
  getCCXTInstance,
  releaseCCXTInstance,
  type CCXTInstanceConfig,
} from './ccxtCache';

const HEARTBEAT_MS = 5_000;
const RETRY_BASE_MS = 1_000;
const RETRY_MAX_MS = 30_000;
const MAX_ACTIVE_PRIVATE_SUBSCRIPTIONS = 200;
const SUBSCRIPTION_FATAL_ERRORS = new Set(['PermissionDenied', 'BadSymbol']);
const CHANNEL_UNAVAILABLE_ERRORS = new Set(['NotSupported', 'ArgumentsRequired']);

export interface PrivateWebSocketSubscription {
  id: string;
  socketId: string;
  ssoUserId: string;
  accountId: string;
  exchangeId: string;
  symbol: string;
  market: string;
  active: boolean;
  activated: boolean;
  capabilities: PrivateTradingCapabilities;
  heartbeat?: ReturnType<typeof setInterval>;
  runtime: any;
  runtimeConfig: CCXTInstanceConfig;
  runtimeGeneration: number;
  authRecoveryAttempted: boolean;
  lastEventAt: Partial<Record<PrivateTradingDataType, number>>;
  refreshRuntime?: Promise<any>;
  emitData: StartPrivateSubscriptionArgs['emitData'];
  emitError: StartPrivateSubscriptionArgs['emitError'];
  emitHeartbeat: StartPrivateSubscriptionArgs['emitHeartbeat'];
}

interface StartPrivateSubscriptionArgs {
  id: string;
  socketId: string;
  ssoUserId: string;
  accountId: string;
  exchangeId: string;
  symbol: string;
  market?: string;
  emitData: (socketId: string, event: PrivateTradingDataEvent) => void;
  emitError: (socketId: string, event: PrivateTradingErrorEvent) => void;
  emitHeartbeat: (socketId: string, event: PrivateTradingHeartbeat) => void;
}

const activePrivateSubscriptions = new Map<string, PrivateWebSocketSubscription>();
const privateSubscriptionsBySocket = new Map<string, Set<string>>();
const pendingPrivateSubscriptionIds = new Set<string>();

const capabilitiesOf = (exchange: any, market: string): PrivateTradingCapabilities => ({
  orders: exchange?.has?.watchOrders === true,
  myTrades: exchange?.has?.watchMyTrades === true,
  // Spot inventory is a balance, not a CCXT position. Never open a position
  // watcher for spot even if an exchange advertises the generic method.
  positions: market !== 'spot' && exchange?.has?.watchPositions === true,
});

const eventPayload = (
  subscription: PrivateWebSocketSubscription,
  dataType: PrivateTradingDataType,
  data: unknown,
): PrivateTradingDataEvent => ({
  subscriptionId: subscription.id,
  accountId: subscription.accountId,
  exchangeId: subscription.exchangeId,
  symbol: subscription.symbol,
  dataType,
  data,
  source: 'stream',
  generation: subscription.runtimeGeneration,
  timestamp: Date.now(),
});

const safeChannelError = (
  dataType: PrivateTradingDataType,
  kind: 'unavailable' | 'failed',
): string => `Private ${dataType} stream ${kind}`;

function remember(subscription: PrivateWebSocketSubscription): void {
  activePrivateSubscriptions.set(subscription.id, subscription);
  const ids = privateSubscriptionsBySocket.get(subscription.socketId) ?? new Set<string>();
  ids.add(subscription.id);
  privateSubscriptionsBySocket.set(subscription.socketId, ids);
}

async function buildRuntime(
  subscription: Pick<PrivateWebSocketSubscription, 'id' | 'ssoUserId' | 'accountId' | 'exchangeId' | 'market'>,
): Promise<{ runtime: any; config: CCXTInstanceConfig }> {
  const credentials = await fetchCredentials({
    ssoUserId: subscription.ssoUserId,
    credentialId: subscription.accountId,
    want: 'read',
  });
  const config: CCXTInstanceConfig = {
    exchangeId: subscription.exchangeId,
    marketType: subscription.market,
    ccxtType: 'pro',
    apiKey: credentials.apiKey,
    secret: credentials.secret,
    password: credentials.password,
    // Each subscription owns exactly one runtime lease. It is still scoped by
    // SSO identity and account, while teardown can close it without disturbing
    // another symbol or browser tab.
    userId: `${subscription.ssoUserId}:${subscription.accountId}:${subscription.id}`,
  };
  return { runtime: await getCCXTInstance(config, { lease: true }), config };
}

async function replaceFailedRuntime(subscription: PrivateWebSocketSubscription, failed: any): Promise<any> {
  if (!subscription.active) throw new Error('Private subscription stopped');
  if (subscription.runtime !== failed) return subscription.runtime;
  if (!subscription.refreshRuntime) {
    subscription.refreshRuntime = (async () => {
      const oldConfig = subscription.runtimeConfig;
      await releaseCCXTInstance(oldConfig, failed);
      // A watch authentication failure often means the saved key was rotated.
      // Do not reuse the auth service cache on this recovery path.
      invalidateCredentialCache(subscription.accountId);
      const replacement = await buildRuntime(subscription);
      if (!subscription.active) {
        await releaseCCXTInstance(replacement.config, replacement.runtime);
        throw new Error('Private subscription stopped');
      }
      subscription.runtime = replacement.runtime;
      subscription.runtimeConfig = replacement.config;
      subscription.runtimeGeneration += 1;
      subscription.lastEventAt = {};
      const previousCapabilities = subscription.capabilities;
      subscription.capabilities = capabilitiesOf(replacement.runtime, subscription.market);
      for (const dataType of ['orders', 'myTrades', 'positions'] as const) {
        if (previousCapabilities[dataType] && !subscription.capabilities[dataType]) {
          subscription.emitError(subscription.socketId, {
            subscriptionId: subscription.id,
            accountId: subscription.accountId,
            dataType,
            error: safeChannelError(dataType, 'unavailable'),
            fatal: false,
            unavailable: true,
            generation: subscription.runtimeGeneration,
          });
        }
      }
      return replacement.runtime;
    })().finally(() => {
      subscription.refreshRuntime = undefined;
    });
  }
  return subscription.refreshRuntime;
}

const watchNext = (
  exchange: any,
  dataType: PrivateTradingDataType,
  symbol: string,
): Promise<unknown> => {
  if (dataType === 'orders') return exchange.watchOrders(symbol, undefined, undefined, {});
  if (dataType === 'myTrades') return exchange.watchMyTrades(symbol, undefined, undefined, {});
  return exchange.watchPositions([symbol], undefined, undefined, {});
};

function runWatchLoop(subscription: PrivateWebSocketSubscription, dataType: PrivateTradingDataType): void {
  let retryMs = RETRY_BASE_MS;

  const next = async (): Promise<void> => {
    if (!subscription.active || !subscription.activated || !subscription.capabilities[dataType]) return;
    const runtime = subscription.runtime;
    const generation = subscription.runtimeGeneration;
    try {
      const data = await watchNext(runtime, dataType, subscription.symbol);
      if (!subscription.active) return;
      // Closing a failed runtime can race with a watch promise already resolving.
      // Never publish that old generation on top of a newer REST/stream state.
      if (subscription.runtime !== runtime || subscription.runtimeGeneration !== generation) {
        queueMicrotask(() => void next());
        return;
      }
      retryMs = RETRY_BASE_MS;
      subscription.authRecoveryAttempted = false;
      subscription.lastEventAt[dataType] = Date.now();
      subscription.emitData(subscription.socketId, eventPayload(subscription, dataType, data));
      queueMicrotask(() => void next());
    } catch (error) {
      if (!subscription.active) return;
      if (subscription.runtime !== runtime || subscription.runtimeGeneration !== generation) {
        queueMicrotask(() => void next());
        return;
      }
      const errorName = error instanceof Error ? error.name : '';

      if (CHANNEL_UNAVAILABLE_ERRORS.has(errorName)) {
        subscription.capabilities[dataType] = false;
        subscription.emitError(subscription.socketId, {
          subscriptionId: subscription.id,
          accountId: subscription.accountId,
          dataType,
          error: safeChannelError(dataType, 'unavailable'),
          fatal: false,
          unavailable: true,
          generation: subscription.runtimeGeneration,
        });
        return;
      }

      const recoverableAuthentication = errorName === 'AuthenticationError' && !subscription.authRecoveryAttempted;
      const fatal = SUBSCRIPTION_FATAL_ERRORS.has(errorName)
        || (errorName === 'AuthenticationError' && !recoverableAuthentication);
      subscription.emitError(subscription.socketId, {
        subscriptionId: subscription.id,
        accountId: subscription.accountId,
        dataType,
        error: safeChannelError(dataType, 'failed'),
        fatal,
        ...(!fatal ? { retryInMs: retryMs } : {}),
        generation: subscription.runtimeGeneration,
      });
      if (fatal) {
        await stopPrivateSubscription(subscription.id);
        return;
      }

      if (recoverableAuthentication) subscription.authRecoveryAttempted = true;

      try {
        await replaceFailedRuntime(subscription, runtime);
      } catch {
        // The next bounded retry repeats credential/runtime recovery. The error
        // already emitted above is deliberately free of credential material.
      }
      if (!subscription.active) return;
      setTimeout(() => void next(), retryMs);
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    }
  };

  void next();
}

/** Resolve credentials and capabilities, but do not watch until the ack is sent. */
export async function startPrivateSubscription(
  args: StartPrivateSubscriptionArgs,
): Promise<PrivateWebSocketSubscription> {
  if (activePrivateSubscriptions.has(args.id) || pendingPrivateSubscriptionIds.has(args.id)) {
    throw new Error('Private subscription already exists');
  }
  if (activePrivateSubscriptions.size + pendingPrivateSubscriptionIds.size >= MAX_ACTIVE_PRIVATE_SUBSCRIPTIONS) {
    throw new Error('Private subscription capacity reached');
  }
  pendingPrivateSubscriptionIds.add(args.id);
  const market = args.market ?? 'spot';
  try {
    const built = await buildRuntime({ ...args, market });
    const subscription: PrivateWebSocketSubscription = {
      id: args.id,
      socketId: args.socketId,
      ssoUserId: args.ssoUserId,
      accountId: args.accountId,
      exchangeId: args.exchangeId,
      symbol: args.symbol,
      market,
      active: true,
      activated: false,
      capabilities: capabilitiesOf(built.runtime, market),
      runtime: built.runtime,
      runtimeConfig: built.config,
      runtimeGeneration: 1,
      authRecoveryAttempted: false,
      lastEventAt: {},
      emitData: args.emitData,
      emitError: args.emitError,
      emitHeartbeat: args.emitHeartbeat,
    };
    remember(subscription);
    return subscription;
  } finally {
    pendingPrivateSubscriptionIds.delete(args.id);
  }
}

/** Start watch loops only after Socket.IO has delivered private:subscribed. */
export function activatePrivateSubscription(subscriptionId: string): void {
  const subscription = activePrivateSubscriptions.get(subscriptionId);
  if (!subscription || !subscription.active || subscription.activated) return;
  subscription.activated = true;
  if (subscription.capabilities.orders) runWatchLoop(subscription, 'orders');
  if (subscription.capabilities.myTrades) runWatchLoop(subscription, 'myTrades');
  if (subscription.capabilities.positions) runWatchLoop(subscription, 'positions');
  subscription.heartbeat = setInterval(() => {
    if (!subscription.active) return;
    subscription.emitHeartbeat(subscription.socketId, {
      subscriptionId: subscription.id,
      generation: subscription.runtimeGeneration,
      capabilities: { ...subscription.capabilities },
      lastEventAt: { ...subscription.lastEventAt },
      timestamp: Date.now(),
    });
  }, HEARTBEAT_MS);
}

async function bestEffortUnwatch(subscription: PrivateWebSocketSubscription): Promise<void> {
  const exchange = subscription.runtime;
  const calls: Promise<unknown>[] = [];
  if (exchange?.has?.unWatchOrders === true && typeof exchange.unWatchOrders === 'function') {
    calls.push(exchange.unWatchOrders(subscription.symbol, {}));
  }
  if (exchange?.has?.unWatchMyTrades === true && typeof exchange.unWatchMyTrades === 'function') {
    calls.push(exchange.unWatchMyTrades(subscription.symbol, {}));
  }
  if (
    subscription.market !== 'spot'
    && exchange?.has?.unWatchPositions === true
    && typeof exchange.unWatchPositions === 'function'
  ) {
    calls.push(exchange.unWatchPositions([subscription.symbol], {}));
  }
  await Promise.allSettled(calls);
}

export async function stopPrivateSubscription(subscriptionId: string): Promise<void> {
  const subscription = activePrivateSubscriptions.get(subscriptionId);
  if (!subscription) return;
  subscription.active = false;
  if (subscription.heartbeat) clearInterval(subscription.heartbeat);
  activePrivateSubscriptions.delete(subscriptionId);
  const ids = privateSubscriptionsBySocket.get(subscription.socketId);
  ids?.delete(subscriptionId);
  if (ids?.size === 0) privateSubscriptionsBySocket.delete(subscription.socketId);
  await bestEffortUnwatch(subscription);
  await releaseCCXTInstance(subscription.runtimeConfig, subscription.runtime);
}

export async function stopSocketPrivateSubscriptions(socketId: string): Promise<void> {
  await Promise.all(
    Array.from(privateSubscriptionsBySocket.get(socketId) ?? [], (id) => stopPrivateSubscription(id)),
  );
}

export function hasPrivateSubscription(subscriptionId: string): boolean {
  return activePrivateSubscriptions.has(subscriptionId);
}
