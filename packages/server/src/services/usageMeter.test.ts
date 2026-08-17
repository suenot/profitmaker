import { afterEach, describe, expect, it } from 'vitest';
import { createHmac } from 'node:crypto';
import { UsageMeter } from './usageMeter';

const meters: UsageMeter[] = [];

afterEach(() => {
  for (const meter of meters.splice(0)) meter.stop();
});

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const signedSnapshot = (payload: Record<string, unknown>, secret = 'test-secret') => ({
  payload,
  signature: createHmac('sha256', secret).update(JSON.stringify(payload)).digest('base64url'),
});

describe('UsageMeter', () => {
  it('does not make a billing request in the stream hot path', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const meter = new UsageMeter({
      enabled: true,
      internalSecret: 'test-secret',
      fetchFn: (async (input: string | URL | Request, init?: RequestInit) => {
        requests.push({ url: String(input), init });
        return jsonResponse({ accepted: 1 });
      }) as typeof fetch,
    });
    meters.push(meter);

    const stream = meter.beginStream({
      userId: 'user-1',
      operationCode: 'terminal.market.orderbook_stream',
      canonicalChannelHash: 'channel-hash',
      connectionId: 'socket-1',
      sessionId: 'session-1',
    });
    stream.publication(25);
    stream.providerUsage(2);
    stream.close();

    expect(requests).toHaveLength(0);
    await meter.flush();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toMatch(/\/api\/v1\/internal\/usage\/events:batch$/);

    const body = JSON.parse(String(requests[0]?.init?.body));
    expect(body.events[0]).toMatchObject({
      user_id: 'user-1',
      operation_code: 'terminal.market.orderbook_stream',
      unit_price_mm: '0',
      price_version: 'unregistered',
      ws_checkpoint: {
        session_id: 'session-1',
        connection_id: 'socket-1',
        cumulative_publications: 1,
        cumulative_payload_bytes: 25,
        cumulative_provider_units: '2',
      },
    });
  });

  it('uses cached pricing and reports it in subscription metadata', async () => {
    const meter = new UsageMeter({
      enabled: true,
      internalSecret: 'test-secret',
      fetchFn: (async (_input: string | URL | Request, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse({ accepted: 1 });
        return jsonResponse(signedSnapshot({
          service: 'profitmaker',
          version: 'terminal-v2',
          generated_at: '2026-08-17T00:00:00Z',
          operations: [{
            operation_code: 'terminal.market.trades_stream',
            billing_model: 'active_subscription_time',
            unit_type: 'weighted_second',
            unit_price_mm: '0.00001',
            channel_weight: '2',
            price_version: 'terminal-v2',
          }],
        }));
      }) as typeof fetch,
    });
    meters.push(meter);

    await meter.refreshPricing();
    expect(meter.describe('terminal.market.trades_stream')).toMatchObject({
      billing_model: 'active_subscription_time',
      unit_price_mm: '0.00001',
      channel_weight: '2',
      price_version: 'terminal-v2',
    });
    expect(meter.describe('terminal.market.unknown_stream')).toMatchObject({
      billing_model: 'free',
      unit_price_mm: '0',
      price_version: 'unregistered',
    });
  });

  it('rejects a pricing snapshot with an invalid signature', async () => {
    const meter = new UsageMeter({
      enabled: true,
      internalSecret: 'test-secret',
      fetchFn: (async () => jsonResponse({
        payload: {
          service: 'profitmaker',
          version: 2,
          generated_at: '2026-08-17T00:00:00Z',
          operations: [{
            operation_code: 'terminal.market.ticker_stream',
            billing_model: 'active_subscription_time',
            unit_type: 'weighted_second',
            unit_price_mm: '1',
          }],
        },
        signature: 'tampered',
      })) as typeof fetch,
    });
    meters.push(meter);

    await meter.refreshPricing();

    expect(meter.stats().pricing_version).toBe('unregistered');
    expect(meter.stats().registered_operations).toBe(0);
  });

  it('retains checkpoints in order after a rejected batch', async () => {
    const sequences: number[][] = [];
    let fail = true;
    const meter = new UsageMeter({
      enabled: true,
      internalSecret: 'test-secret',
      fetchFn: (async (_input: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body));
        sequences.push(body.events.map((event: any) => event.ws_checkpoint.checkpoint_seq));
        return fail ? jsonResponse({}, 503) : jsonResponse({ accepted: body.events.length });
      }) as typeof fetch,
    });
    meters.push(meter);

    const stream = meter.beginStream({
      userId: 'user-1',
      operationCode: 'terminal.market.ticker_stream',
      canonicalChannelHash: 'channel-hash',
      connectionId: 'socket-1',
      sessionId: 'session-1',
    });
    stream.close();
    await meter.flush();
    expect(meter.stats().buffered_events).toBe(1);

    fail = false;
    await meter.flush();
    expect(sequences).toEqual([[1], [1]]);
  });
});
