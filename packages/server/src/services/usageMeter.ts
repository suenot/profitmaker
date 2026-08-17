import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

type BillingModel = 'free' | 'per_operation' | 'active_subscription_time' | 'provider_units';

type PricingOperation = {
  operation_code: string;
  billing_model: BillingModel;
  unit_type: string;
  unit_price_mm: string;
  channel_weight?: string;
  price_version?: string;
};

type PricingSnapshot = {
  service: string;
  version: string | number;
  generated_at: string;
  operations: PricingOperation[];
};

type PricingSnapshotEnvelope = {
  payload: PricingSnapshot;
  signature: string;
};

type UsageEvent = {
  event_id: string;
  event_type: 'stream.usage.checkpoint';
  event_version: 1;
  occurred_at: string;
  user_id?: string;
  operation_code: string;
  transport: 'ws';
  outcome: 'success';
  quantity: string;
  provider_units: string;
  price_version: string;
  unit_price_mm: string;
  ws_checkpoint: {
    session_id: string;
    connection_id: string;
    checkpoint_seq: number;
    canonical_channel_hash: string;
    cumulative_active_ms: number;
    cumulative_publications: number;
    cumulative_payload_bytes: number;
    cumulative_provider_units: string;
    paused_ms: number;
  };
};

type StreamState = {
  sessionId: string;
  connectionId: string;
  userId?: string;
  operationCode: string;
  channelHash: string;
  startedAtMs: number;
  pausedAtMs?: number;
  pausedMs: number;
  publications: number;
  payloadBytes: number;
  providerUnits: number;
  checkpointSeq: number;
};

export type StreamUsageHandle = {
  publication(payloadBytes?: number): void;
  providerUsage(units: number): void;
  pause(): void;
  resume(): void;
  close(): void;
};

type UsageMeterOptions = {
  enabled?: boolean;
  authServiceUrl?: string;
  internalSecret?: string;
  fetchFn?: typeof fetch;
  maxBufferedEvents?: number;
  checkpointIntervalMs?: number;
  flushIntervalMs?: number;
  pricingRefreshMs?: number;
};

const DEFAULT_FREE: PricingOperation = {
  operation_code: 'unknown',
  billing_model: 'free',
  unit_type: 'weighted_second',
  unit_price_mm: '0',
  price_version: 'unregistered',
};

export class UsageMeter {
  private readonly enabled: boolean;
  private readonly authServiceUrl: string;
  private readonly internalSecret: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxBufferedEvents: number;
  private readonly checkpointIntervalMs: number;
  private readonly flushIntervalMs: number;
  private readonly pricingRefreshMs: number;
  private readonly queue: UsageEvent[] = [];
  private readonly streams = new Map<string, StreamState>();
  private readonly pricing = new Map<string, PricingOperation>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private flushing = false;
  private started = false;
  private snapshotVersion = 'unregistered';
  private droppedEvents = 0;
  private rejectedBatches = 0;

  constructor(options: UsageMeterOptions = {}) {
    this.enabled = options.enabled ?? process.env.USAGE_METERING_ENABLED === '1';
    this.authServiceUrl = (options.authServiceUrl ?? process.env.AUTH_INTERNAL_URL ?? process.env.AUTH_URL ?? 'https://auth.marketmaker.cc').replace(/\/$/, '');
    this.internalSecret = options.internalSecret ?? process.env.AUTH_INTERNAL_SECRET ?? '';
    this.fetchFn = options.fetchFn ?? fetch;
    this.maxBufferedEvents = options.maxBufferedEvents ?? 50_000;
    this.checkpointIntervalMs = options.checkpointIntervalMs ?? 5_000;
    this.flushIntervalMs = options.flushIntervalMs ?? 1_000;
    this.pricingRefreshMs = options.pricingRefreshMs ?? 60_000;
  }

  start(): void {
    if (!this.enabled || this.started) return;
    this.started = true;
    void this.refreshPricing();
    this.timers.push(setInterval(() => this.checkpointStreams(), this.checkpointIntervalMs));
    this.timers.push(setInterval(() => void this.flush(), this.flushIntervalMs));
    this.timers.push(setInterval(() => void this.refreshPricing(), this.pricingRefreshMs));
  }

  stop(): void {
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    this.started = false;
  }

  describe(operationCode: string): PricingOperation {
    return this.pricing.get(operationCode) ?? { ...DEFAULT_FREE, operation_code: operationCode };
  }

  beginStream(input: {
    userId?: string;
    operationCode: string;
    canonicalChannelHash: string;
    connectionId: string;
    sessionId?: string;
  }): StreamUsageHandle {
    const state: StreamState = {
      sessionId: input.sessionId ?? randomUUID(),
      connectionId: input.connectionId,
      userId: input.userId,
      operationCode: input.operationCode,
      channelHash: input.canonicalChannelHash,
      startedAtMs: Date.now(),
      pausedMs: 0,
      publications: 0,
      payloadBytes: 0,
      providerUnits: 0,
      checkpointSeq: 0,
    };
    if (this.enabled) this.streams.set(state.sessionId, state);

    let closed = false;
    return {
      publication: (bytes = 0) => {
        if (closed || !this.enabled) return;
        state.publications += 1;
        state.payloadBytes += Math.max(0, bytes);
      },
      providerUsage: (units) => {
        if (closed || !this.enabled) return;
        state.providerUnits += Math.max(0, units);
      },
      pause: () => {
        if (!closed && this.enabled && state.pausedAtMs === undefined) state.pausedAtMs = Date.now();
      },
      resume: () => {
        if (closed || !this.enabled || state.pausedAtMs === undefined) return;
        state.pausedMs += Date.now() - state.pausedAtMs;
        state.pausedAtMs = undefined;
      },
      close: () => {
        if (closed) return;
        closed = true;
        if (!this.enabled) return;
        this.emitCheckpoint(state);
        this.streams.delete(state.sessionId);
      },
    };
  }

  async refreshPricing(): Promise<void> {
    if (!this.enabled || !this.internalSecret) return;
    try {
      const response = await this.fetchFn(`${this.authServiceUrl}/api/v1/internal/pricing/snapshot/profitmaker`, {
        headers: { 'X-Internal-Secret': this.internalSecret },
      });
      if (!response.ok) return;
      const envelope = await response.json() as PricingSnapshotEnvelope;
      if (!this.validPricingSignature(envelope)) {
        console.warn('[usage-meter] rejected pricing snapshot with an invalid signature');
        return;
      }
      const snapshot = envelope.payload;
      if (!Array.isArray(snapshot.operations)) return;
      this.pricing.clear();
      for (const operation of snapshot.operations) this.pricing.set(operation.operation_code, operation);
      this.snapshotVersion = snapshot.version ? String(snapshot.version) : 'unregistered';
    } catch (error) {
      console.warn('[usage-meter] pricing refresh failed; cached prices remain active', error);
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || this.flushing || !this.internalSecret || this.queue.length === 0) return;
    this.flushing = true;
    const events = this.queue.splice(0, 1_000);
    try {
      const response = await this.fetchFn(`${this.authServiceUrl}/api/v1/internal/usage/events:batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': this.internalSecret },
        body: JSON.stringify({ service: 'profitmaker', service_id: 'profitmaker', batch_id: randomUUID(), events }),
      });
      if (!response.ok) throw new Error(`usage ingestion returned ${response.status}`);
    } catch (error) {
      this.rejectedBatches += 1;
      const available = Math.max(0, this.maxBufferedEvents - this.queue.length);
      this.queue.unshift(...events.slice(0, available));
      console.warn('[usage-meter] batch delivery failed; retained for retry', error);
    } finally {
      this.flushing = false;
    }
  }

  stats() {
    return {
      enabled: this.enabled,
      started: this.started,
      buffered_events: this.queue.length,
      active_streams: this.streams.size,
      pricing_version: this.snapshotVersion,
      registered_operations: this.pricing.size,
      dropped_events: this.droppedEvents,
      rejected_batches: this.rejectedBatches,
    };
  }

  private checkpointStreams(): void {
    for (const state of this.streams.values()) this.emitCheckpoint(state);
  }

  private validPricingSignature(envelope: PricingSnapshotEnvelope): boolean {
    if (!envelope?.payload || typeof envelope.signature !== 'string') return false;
    const expected = createHmac('sha256', this.internalSecret)
      .update(JSON.stringify(envelope.payload))
      .digest('base64url');
    const actualBytes = Buffer.from(envelope.signature);
    const expectedBytes = Buffer.from(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  }

  private emitCheckpoint(state: StreamState): void {
    const operation = this.describe(state.operationCode);
    const now = Date.now();
    const currentPauseMs = state.pausedAtMs === undefined ? 0 : now - state.pausedAtMs;
    state.checkpointSeq += 1;
    if (this.queue.length >= this.maxBufferedEvents) {
      this.droppedEvents += 1;
      return;
    }
    this.queue.push({
      event_id: randomUUID(),
      event_type: 'stream.usage.checkpoint',
      event_version: 1,
      occurred_at: new Date(now).toISOString(),
      user_id: state.userId,
      operation_code: state.operationCode,
      transport: 'ws',
      outcome: 'success',
      quantity: '0',
      provider_units: String(state.providerUnits),
      price_version: operation.price_version ?? this.snapshotVersion,
      unit_price_mm: operation.unit_price_mm,
      ws_checkpoint: {
        session_id: state.sessionId,
        connection_id: state.connectionId,
        checkpoint_seq: state.checkpointSeq,
        canonical_channel_hash: state.channelHash,
        cumulative_active_ms: Math.max(0, now - state.startedAtMs - state.pausedMs - currentPauseMs),
        cumulative_publications: state.publications,
        cumulative_payload_bytes: state.payloadBytes,
        cumulative_provider_units: String(state.providerUnits),
        paused_ms: state.pausedMs + currentPauseMs,
      },
    });
  }
}

export const usageMeter = new UsageMeter();
