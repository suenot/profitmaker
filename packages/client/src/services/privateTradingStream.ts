import { io, type Socket } from 'socket.io-client';
import type {
  PrivateTradingCapabilities,
  PrivateTradingDataEvent,
  PrivateTradingDataType,
  PrivateTradingErrorEvent,
  PrivateTradingSubscribed,
} from '@profitmaker/types';
import { useDataProviderStore } from '../store/dataProviderStore';
import { deriveSocketUrl } from '../store/providers/ccxtServerProvider';
import { getSsoToken } from './ssoClient';
import { PrivateTradingLedger } from './privateTradingLedger';

type Row = Record<string, unknown>;
type PrivateMode = 'connecting' | 'backfill' | 'streaming' | 'rest';

export interface PrivateTradingSnapshot {
  openOrders: Row[];
  positions: Row[];
  myTrades: Row[];
  revision: number;
  mode: PrivateMode;
  capabilities: PrivateTradingCapabilities;
}

interface SocketLike {
  connected: boolean;
  on(event: string, listener: (payload?: unknown) => void): this;
  off(event: string, listener: (payload?: unknown) => void): this;
  emit(event: string, payload?: unknown): this;
  disconnect(): this;
}

export interface PrivateTradingSubscriptionOptions {
  accountId: string;
  exchangeId: string;
  symbol: string;
  market: string;
  fetchOpenOrders: () => Promise<unknown[]>;
  fetchPositions: () => Promise<unknown[]>;
  fetchMyTrades: (since: number) => Promise<unknown[]>;
  onSnapshot: (snapshot: PrivateTradingSnapshot) => void;
  fallbackPollMs?: number;
  warmupBackfillMs?: number;
  /** Test seams; production callers should leave these unset. */
  socketFactory?: (url: string) => SocketLike;
  tokenProvider?: () => string | undefined;
  socketUrl?: string;
}

export interface PrivateTradingSubscription {
  reconcile(): Promise<void>;
  close(): void;
}

interface BufferedEvent {
  event: PrivateTradingDataEvent;
  localGeneration: number;
  receivedAt: number;
}

const NO_CAPABILITIES: PrivateTradingCapabilities = {
  orders: false,
  myTrades: false,
  positions: false,
};
const TRADE_OVERLAP_MS = 60_000;
const DEFAULT_FALLBACK_POLL_MS = 4_000;
const DEFAULT_WARMUP_BACKFILL_MS = 1_000;

const localMidnight = (): number => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const resolveSocketUrl = (exchangeId: string): string => {
  const provider = useDataProviderStore.getState().getProviderForExchange(exchangeId);
  if (provider?.type === 'ccxt-server') {
    return (provider.config.socketUrl || deriveSocketUrl(provider.config.serverUrl)).replace(/\/$/, '');
  }
  const base = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3001';
  return deriveSocketUrl(base);
};

const requiredChannels = (market: string): PrivateTradingDataType[] => (
  market === 'spot' ? ['orders', 'myTrades'] : ['orders', 'myTrades', 'positions']
);

const isForSubscription = (
  event: { subscriptionId?: string; accountId?: string },
  subscriptionId: string | undefined,
  accountId: string,
): boolean => Boolean(subscriptionId && event.subscriptionId === subscriptionId && event.accountId === accountId);

/**
 * One authenticated private-stream lease for one account/instrument. It never
 * sends exchange credentials: only the central account id and routing fields.
 */
export class PrivateTradingSession {
  private readonly ledger = new PrivateTradingLedger();
  private readonly listeners = new Set<(snapshot: PrivateTradingSnapshot) => void>();
  private socket?: SocketLike;
  private subscriptionId?: string;
  private capabilities: PrivateTradingCapabilities = { ...NO_CAPABILITIES };
  private mode: PrivateMode = 'connecting';
  private localGeneration = 0;
  private serverGeneration?: number;
  private buffer: BufferedEvent[] = [];
  private seeding = false;
  private stopped = false;
  private fallbackTimer?: ReturnType<typeof setInterval>;
  private warmupTimer?: ReturnType<typeof setTimeout>;
  private reconcileRun?: { generation: number; promise: Promise<void> };
  private warmupBackfillPending = false;
  private warmupEventSeen = false;
  private rejectedToken?: string;
  private streamSuppressed = false;
  private streamDegraded = false;

  constructor(private readonly options: PrivateTradingSubscriptionOptions) {
    this.listeners.add(options.onSnapshot);
  }

  addListener(listener: (snapshot: PrivateTradingSnapshot) => void): void {
    this.listeners.add(listener);
    listener(this.snapshot());
  }

  removeListener(listener: (snapshot: PrivateTradingSnapshot) => void): void {
    this.listeners.delete(listener);
  }

  start(): void {
    this.publish();
    const token = this.tokenProvider()();
    if (!token) {
      this.enterRestMode();
      void this.reconcile();
      return;
    }
    this.connectSocket();
  }

  async reconcile(force = false): Promise<void> {
    if (this.stopped) return;
    // While every private channel is healthy, REST must not overwrite stream
    // truth merely because a create/cancel command just returned. Forced runs
    // are reserved for subscription seeding and the first-event catch-up.
    if (!force && this.mode === 'streaming' && !this.seeding) return;
    const generation = this.localGeneration;
    if (this.reconcileRun?.generation === generation) return this.reconcileRun.promise;

    const promise = this.runReconcile(generation).finally(() => {
      if (this.reconcileRun?.promise === promise) this.reconcileRun = undefined;
    });
    this.reconcileRun = { generation, promise };
    return promise;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    if (this.warmupTimer) clearTimeout(this.warmupTimer);
    this.fallbackTimer = undefined;
    this.warmupTimer = undefined;
    if (this.socket && this.subscriptionId && this.socket.connected) {
      this.socket.emit('private:unsubscribe', { subscriptionId: this.subscriptionId });
    }
    this.detachSocket();
    this.listeners.clear();
  }

  private tokenProvider(): () => string | undefined {
    // Only an SSO JWT has the canonical identity required by private:subscribe.
    // A provider API token/local session can authenticate other server paths,
    // but using it here would only cause a fatal private-stream rejection.
    return this.options.tokenProvider ?? getSsoToken;
  }

  private socketFactory(): (url: string) => SocketLike {
    return this.options.socketFactory ?? ((url) => io(url, {
      transports: ['websocket'],
      timeout: 15_000,
      reconnection: true,
    }) as Socket);
  }

  private connectSocket(): void {
    if (this.stopped || this.socket) return;
    const token = this.tokenProvider()();
    if (!token || token === this.rejectedToken) {
      this.enterRestMode();
      return;
    }

    this.mode = 'connecting';
    this.streamSuppressed = false;
    const socket = this.socketFactory()(this.options.socketUrl ?? resolveSocketUrl(this.options.exchangeId));
    this.socket = socket;

    const onConnect = () => {
      if (this.stopped || this.socket !== socket) return;
      const liveToken = this.tokenProvider()();
      if (!liveToken) {
        this.enterRestMode();
        this.detachSocket();
        void this.reconcile();
        return;
      }
      this.localGeneration += 1;
      this.subscriptionId = undefined;
      this.serverGeneration = undefined;
      this.capabilities = { ...NO_CAPABILITIES };
      this.buffer = [];
      this.seeding = false;
      this.warmupBackfillPending = true;
      this.warmupEventSeen = false;
      if (this.warmupTimer) clearTimeout(this.warmupTimer);
      this.warmupTimer = undefined;
      this.mode = 'connecting';
      this.streamDegraded = false;
      this.publish();
      socket.emit('authenticate', { token: liveToken });
    };
    const onAuthenticated = () => {
      if (this.stopped || this.socket !== socket || this.streamSuppressed) return;
      socket.emit('private:subscribe', {
        accountId: this.options.accountId,
        exchangeId: this.options.exchangeId,
        symbol: this.options.symbol,
        market: this.options.market,
      });
    };
    const onAuthError = () => {
      if (this.socket !== socket) return;
      this.rejectedToken = this.tokenProvider()();
      this.enterRestMode();
      this.detachSocket();
      void this.reconcile();
    };
    const onSubscribed = (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const event = payload as PrivateTradingSubscribed & { generation?: number };
      if (
        this.stopped
        || this.socket !== socket
        || event.accountId !== this.options.accountId
        || event.exchangeId !== this.options.exchangeId
        || event.symbol !== this.options.symbol
      ) return;
      this.subscriptionId = event.subscriptionId;
      this.serverGeneration = event.generation;
      this.capabilities = { ...event.capabilities };
      this.streamDegraded = false;
      this.seeding = true;
      this.buffer = [];
      this.mode = 'backfill';
      this.publish();
      const localGeneration = this.localGeneration;
      void this.reconcile(true).then(() => {
        if (this.stopped || localGeneration !== this.localGeneration || !this.warmupBackfillPending) return;
        if (this.warmupEventSeen) {
          this.beginWarmupBackfill();
          return;
        }
        this.warmupTimer = setTimeout(
          () => this.beginWarmupBackfill(),
          this.options.warmupBackfillMs ?? DEFAULT_WARMUP_BACKFILL_MS,
        );
      });
    };
    const onData = (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const event = payload as PrivateTradingDataEvent & { generation?: number };
      if (!isForSubscription(event, this.subscriptionId, this.options.accountId)) return;
      const buffered: BufferedEvent = {
        event,
        localGeneration: this.localGeneration,
        receivedAt: Date.now(),
      };
      if (
        this.serverGeneration !== undefined
        && event.generation !== undefined
        && event.generation < this.serverGeneration
      ) return;
      if (
        this.serverGeneration !== undefined
        && event.generation !== undefined
        && event.generation > this.serverGeneration
      ) {
        // The server rebuilt CCXT Pro without replacing the Socket.IO
        // subscription. Backfill that generation gap before publishing it.
        const recoveredGeneration = event.generation;
        const reconcileAlreadyRunning = this.reconcileRun?.generation === this.localGeneration;
        this.serverGeneration = recoveredGeneration;
        this.streamDegraded = false;
        this.warmupBackfillPending = false;
        this.warmupEventSeen = false;
        if (this.warmupTimer) clearTimeout(this.warmupTimer);
        this.warmupTimer = undefined;
        this.seeding = true;
        this.buffer.push(buffered);
        this.mode = 'backfill';
        this.publish();
        const reconcile = this.reconcile(true);
        if (reconcileAlreadyRunning) {
          void reconcile.then(() => {
            if (
              !this.stopped
              && buffered.localGeneration === this.localGeneration
              && this.serverGeneration === recoveredGeneration
            ) void this.reconcile(true);
          });
        }
        return;
      }
      if (this.seeding) {
        this.warmupEventSeen = true;
        this.buffer.push(buffered);
        return;
      }
      if (this.warmupBackfillPending) {
        this.beginWarmupBackfill(buffered);
        return;
      }
      this.applyBufferedEvent(buffered);
      this.publish();
    };
    const onPrivateError = (payload?: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const event = payload as PrivateTradingErrorEvent;
      if (event.subscriptionId && event.subscriptionId !== this.subscriptionId) return;
      if (event.accountId && event.accountId !== this.options.accountId) return;
      if (event.dataType && event.unavailable) this.capabilities[event.dataType] = false;
      if (event.fatal) this.streamSuppressed = true;
      this.streamDegraded = true;
      this.enterRestMode();
      void this.reconcile();
    };
    const onDisconnect = () => {
      if (this.stopped || this.socket !== socket) return;
      this.subscriptionId = undefined;
      this.serverGeneration = undefined;
      this.streamDegraded = true;
      this.cancelWarmupBackfill();
      this.enterRestMode();
      void this.reconcile();
    };
    const onConnectError = () => {
      if (this.stopped || this.socket !== socket) return;
      this.streamDegraded = true;
      this.enterRestMode();
      void this.reconcile();
    };

    socket.on('connect', onConnect);
    socket.on('authenticated', onAuthenticated);
    socket.on('auth_error', onAuthError);
    socket.on('private:subscribed', onSubscribed);
    socket.on('private:data', onData);
    socket.on('private:error', onPrivateError);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    this.socketListeners = [
      ['connect', onConnect],
      ['authenticated', onAuthenticated],
      ['auth_error', onAuthError],
      ['private:subscribed', onSubscribed],
      ['private:data', onData],
      ['private:error', onPrivateError],
      ['disconnect', onDisconnect],
      ['connect_error', onConnectError],
    ];
  }

  private socketListeners: Array<[string, (payload?: unknown) => void]> = [];

  private detachSocket(): void {
    const socket = this.socket;
    if (!socket) return;
    for (const [event, listener] of this.socketListeners) socket.off(event, listener);
    this.socketListeners = [];
    socket.disconnect();
    this.socket = undefined;
    this.subscriptionId = undefined;
    this.cancelWarmupBackfill();
  }

  private cancelWarmupBackfill(): void {
    if (this.warmupTimer) clearTimeout(this.warmupTimer);
    this.warmupTimer = undefined;
    this.warmupBackfillPending = false;
    this.warmupEventSeen = false;
  }

  private beginWarmupBackfill(event?: BufferedEvent): void {
    if (this.stopped || !this.warmupBackfillPending) return;
    this.warmupBackfillPending = false;
    this.warmupEventSeen = false;
    if (this.warmupTimer) clearTimeout(this.warmupTimer);
    this.warmupTimer = undefined;
    this.seeding = true;
    if (event) this.buffer.push(event);
    this.mode = 'backfill';
    this.publish();
    void this.reconcile(true);
  }

  private async runReconcile(generation: number): Promise<void> {
    this.seeding = true;
    if (this.subscriptionId) this.mode = 'backfill';
    this.publish();

    // A REST snapshot is only known to be current at request start. Stream
    // events received while the requests are in flight are buffered and then
    // replayed on top, so they cannot be erased by the slower response.
    const snapshotStartedAt = Date.now();
    const since = Math.max(localMidnight(), (this.ledger.latestTradeTimestamp ?? localMidnight()) - TRADE_OVERLAP_MS);
    const [ordersResult, positionsResult, tradesResult] = await Promise.allSettled([
      this.options.fetchOpenOrders(),
      this.options.market === 'spot' ? Promise.resolve(undefined) : this.options.fetchPositions(),
      this.options.fetchMyTrades(since),
    ]);
    if (this.stopped || generation !== this.localGeneration) return;

    const openOrders = ordersResult.status === 'fulfilled' ? ordersResult.value : undefined;
    const positions = positionsResult.status === 'fulfilled' ? positionsResult.value : undefined;
    const myTrades = tradesResult.status === 'fulfilled' ? tradesResult.value : undefined;
    this.ledger.applyBackfill({
      symbol: this.options.symbol,
      snapshotAt: snapshotStartedAt,
      openOrders,
      positions,
      myTrades,
    });

    const buffered = this.buffer;
    this.buffer = [];
    this.seeding = false;
    for (const event of buffered) this.applyBufferedEvent(event, true);

    const restComplete = ordersResult.status === 'fulfilled'
      && tradesResult.status === 'fulfilled'
      && (this.options.market === 'spot' || positionsResult.status === 'fulfilled');
    const streamsComplete = Boolean(this.subscriptionId)
      && requiredChannels(this.options.market).every((channel) => this.capabilities[channel]);
    if (restComplete && streamsComplete && !this.streamSuppressed && !this.streamDegraded) {
      this.mode = 'streaming';
      this.stopFallbackPolling();
    } else {
      this.enterRestMode();
    }
    this.publish();
  }

  private applyBufferedEvent(buffered: BufferedEvent, afterSnapshot = false): void {
    if (buffered.localGeneration !== this.localGeneration) return;
    this.ledger.applyEvent(
      buffered.event.dataType,
      buffered.event.data,
      buffered.receivedAt,
      afterSnapshot,
    );
  }

  private enterRestMode(): void {
    if (this.stopped) return;
    this.mode = 'rest';
    this.ensureFallbackPolling();
    this.publish();
  }

  private ensureFallbackPolling(): void {
    if (this.fallbackTimer || this.stopped) return;
    this.fallbackTimer = setInterval(() => {
      if (!this.socket) {
        const token = this.tokenProvider()();
        if (token && token !== this.rejectedToken) this.connectSocket();
      }
      void this.reconcile();
    }, this.options.fallbackPollMs ?? DEFAULT_FALLBACK_POLL_MS);
  }

  private stopFallbackPolling(): void {
    if (!this.fallbackTimer) return;
    clearInterval(this.fallbackTimer);
    this.fallbackTimer = undefined;
  }

  private snapshot(): PrivateTradingSnapshot {
    return {
      ...this.ledger.snapshot(this.options.symbol),
      mode: this.mode,
      capabilities: { ...this.capabilities },
    };
  }

  private publish(): void {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

interface SharedSession {
  session: PrivateTradingSession;
  listeners: Set<(snapshot: PrivateTradingSnapshot) => void>;
}

const sharedSessions = new Map<string, SharedSession>();

const sessionKey = (options: PrivateTradingSubscriptionOptions): string =>
  `${options.accountId}:${options.exchangeId}:${options.market}:${options.symbol}`;

/** Share one exchange watcher across widgets showing the same account/symbol. */
export function subscribePrivateTrading(
  options: PrivateTradingSubscriptionOptions,
): PrivateTradingSubscription {
  const key = sessionKey(options);
  let shared = sharedSessions.get(key);
  if (!shared) {
    const session = new PrivateTradingSession(options);
    shared = { session, listeners: new Set([options.onSnapshot]) };
    sharedSessions.set(key, shared);
    session.start();
  } else {
    shared.listeners.add(options.onSnapshot);
    shared.session.addListener(options.onSnapshot);
  }

  let closed = false;
  return {
    reconcile: () => shared!.session.reconcile(),
    close: () => {
      if (closed) return;
      closed = true;
      shared!.session.removeListener(options.onSnapshot);
      shared!.listeners.delete(options.onSnapshot);
      if (!shared!.listeners.size) {
        shared!.session.stop();
        sharedSessions.delete(key);
      }
    },
  };
}
