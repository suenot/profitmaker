// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LiveListingsWidget } from './LiveListings';
import type { TerminalAPI } from '@profitmaker/module-sdk';
import type { ModuleListing } from '../shared/types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const enc = new TextEncoder();

const LIVE: ModuleListing = {
  id: 7, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin', type: 'listing',
  title: 't', url: null, listedAt: null, detectedAt: null, source: null,
};
const BACKFILL: ModuleListing = { ...LIVE, id: 1, symbol: 'PEPE' };

/** The /stream response body, with the abort signal captured for close assertions. */
function sseBody() {
  let ctl!: ReadableStreamDefaultController<Uint8Array>;
  let signal: AbortSignal | undefined;
  const stream = new ReadableStream<Uint8Array>({ start(c) { ctl = c; } });
  return {
    capture: (s?: AbortSignal | null) => { signal = s ?? undefined; },
    push: (text: string) => ctl.enqueue(enc.encode(text)),
    response: () => new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } }),
    get signal() { return signal; },
  };
}

/** Fake terminal host: routes the module's authenticated fetches. */
function fakeTerminal(
  stream: ReturnType<typeof sseBody> | { status: number; error: string },
  recent?: () => Response,
) {
  const notifyInfo = vi.fn();
  const toggleWidgetMinimized = vi.fn();
  const fetchImpl = vi.fn(async (path: string, init?: RequestInit): Promise<Response> => {
    if (path === '/api/modules/listing/stream') {
      if ('status' in stream) {
        return new Response(JSON.stringify({ error: stream.error }), {
          status: stream.status,
          headers: { 'content-type': 'application/json' },
        });
      }
      stream.capture(init?.signal);
      return stream.response();
    }
    if (path.startsWith('/api/modules/listing/listings/recent')) {
      if (recent) return recent();
      return new Response(JSON.stringify({ listings: [BACKFILL] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    if (path.startsWith('/api/modules/listing/status')) {
      return new Response(JSON.stringify({ status: 'connecting' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    throw new Error(`unexpected fetch ${path}`);
  });
  const terminal = {
    apiVersion: '1.0.0',
    api: { fetch: fetchImpl, baseUrl: '' },
    notify: { info: notifyInfo, success: vi.fn(), error: vi.fn() },
    stores: {
      // The widget sits minimized so auto-restore is observable through the alert pipeline.
      useDashboardStore: {
        getState: () => ({
          dashboards: [{ id: 'd1', widgets: [{ id: 'w1', isMinimized: true }] }],
          toggleWidgetMinimized,
        }),
      },
    },
    hooks: { useModuleSocket: vi.fn(), useWidgetGroup: vi.fn(), useMarketData: vi.fn() },
    widgets: { register: vi.fn(), registerMany: vi.fn(), unregister: vi.fn() },
  } as unknown as TerminalAPI;
  (globalThis as { __PROFITMAKER__?: TerminalAPI }).__PROFITMAKER__ = terminal;
  return { fetchImpl, notifyInfo, toggleWidgetMinimized };
}

/** Render into a fresh host; returns an unmount that also detaches it. */
async function renderWidget(config: Record<string, unknown> = {}): Promise<() => Promise<void>> {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root: Root = createRoot(host);
  await React.act(async () => {
    root.render(<LiveListingsWidget widgetId="w1" config={config} updateConfig={() => {}} />);
  });
  return async () => {
    await React.act(async () => { root.unmount(); });
    host.remove();
  };
}

/** Push a stream frame and let the read loop + React state settle inside act. */
async function pushFrame(body: ReturnType<typeof sseBody>, frame: string): Promise<void> {
  await React.act(async () => {
    body.push(frame);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

describe('LiveListingsWidget', () => {
  // A failed assertion skips the test's own unmount — drop any leaked hosts.
  afterEach(() => { document.body.innerHTML = ''; });

  it('subscribes on mount, feeds the alert pipeline, unsubscribes on unmount', async () => {
    const body = sseBody();
    const { fetchImpl, notifyInfo, toggleWidgetMinimized } = fakeTerminal(body);
    const unmount = await renderWidget({ sound: false });

    // One /stream subscription plus the mount backfill + status fetches.
    const streamCalls = fetchImpl.mock.calls.filter(([p]) => p === '/api/modules/listing/stream');
    expect(streamCalls).toHaveLength(1);
    expect(fetchImpl.mock.calls.some(([p]) => p.startsWith('/api/modules/listing/listings/recent'))).toBe(true);
    expect(document.body.textContent).toContain('PEPE'); // backfill rendered

    await pushFrame(body, 'event: hello\ndata: {"userId":"u1"}\n\n');
    await pushFrame(body, `event: listing\ndata: ${JSON.stringify(LIVE)}\n\n`);
    expect(document.body.textContent).toContain('DOGE');
    expect(notifyInfo).toHaveBeenCalledWith('Listing: DOGE on binance');
    expect(toggleWidgetMinimized).toHaveBeenCalledWith('d1', 'w1'); // auto-restore fired

    await pushFrame(body, 'event: status\ndata: {"state":"up"}\n\n');
    expect(document.body.textContent).toContain('live');

    await unmount();
    expect(body.signal?.aborted).toBe(true);
    expect(fetchImpl.mock.calls.filter(([p]) => p === '/api/modules/listing/stream')).toHaveLength(1);
  });

  it('backfill frames merge rows without firing the alert pipeline (reconnect/replay)', async () => {
    const body = sseBody();
    const { notifyInfo, toggleWidgetMinimized } = fakeTerminal(body);
    const unmount = await renderWidget({ sound: false });

    // A live row first, so the replay must merge under it (dedupe path too).
    await pushFrame(body, `event: listing\ndata: ${JSON.stringify(LIVE)}\n\n`);
    expect(notifyInfo).toHaveBeenCalledTimes(1);
    expect(toggleWidgetMinimized).toHaveBeenCalledTimes(1);

    // Ring replay of an older id: row appears, no second toast/beep/restore.
    await pushFrame(body, `event: backfill\ndata: ${JSON.stringify(BACKFILL)}\n\n`);
    expect(document.body.textContent).toContain('PEPE');
    expect(document.body.textContent).toContain('DOGE');
    expect(notifyInfo).toHaveBeenCalledTimes(1);
    expect(toggleWidgetMinimized).toHaveBeenCalledTimes(1);

    // A replayed id the widget already has live is deduped away.
    await pushFrame(body, `event: backfill\ndata: ${JSON.stringify(LIVE)}\n\n`);
    expect((document.body.textContent!.match(/DOGE/g) ?? []).length).toBe(1);
    await unmount();
  });

  it('maps a relayed billing status frame to the balance banner (upstream 402)', async () => {
    const body = sseBody();
    fakeTerminal(body);
    const unmount = await renderWidget({ sound: false });

    await pushFrame(body, 'event: status\ndata: {"state":"billing"}\n\n');
    expect(document.body.textContent).toContain('MM balance exhausted — top up at auth.marketmaker.cc');
    // recovery clears it: the banner must not outlive the condition
    await pushFrame(body, 'event: status\ndata: {"state":"up"}\n\n');
    expect(document.body.textContent).not.toContain('MM balance exhausted');
    await unmount();
  });

  it.each([
    [401, 'sign in required'],
    [403, 'listingapis subscription required at auth.marketmaker.cc'],
  ])('maps a terminal %i stream error to its banner', async (status, banner) => {
    fakeTerminal({ status, error: 'user identity required' });
    const unmount = await renderWidget({ sound: false });
    await React.act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(document.body.textContent).toContain(banner);
    await unmount();
  });

  it('maps a 402 stream error to the balance banner (defensive: /stream does not emit 402 today)', async () => {
    fakeTerminal({ status: 402, error: 'MM balance exhausted' });
    const unmount = await renderWidget({ sound: false });
    await React.act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(document.body.textContent).toContain('MM balance exhausted — top up at auth.marketmaker.cc');
    await unmount();
  });

  it('shows the server error body on a retryable 503, not a generic guess', async () => {
    fakeTerminal({ status: 503, error: 'terminal auth bridge not configured' });
    const unmount = await renderWidget({ sound: false });
    await React.act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(document.body.textContent).toContain('terminal auth bridge not configured');
    expect(document.body.textContent).not.toContain('busy, retrying');
    await unmount();
  });

  it('surfaces the mount-backfill error body too (bridge gap, not a key-config guess)', async () => {
    const body = sseBody();
    fakeTerminal(body, () => new Response(JSON.stringify({ error: 'terminal auth bridge not configured' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    }));
    const unmount = await renderWidget({ sound: false });
    await React.act(async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
    });
    expect(document.body.textContent).toContain('terminal auth bridge not configured');
    expect(document.body.textContent).not.toContain('LISTINGAPIS_API_KEY is not configured');
    await unmount();
  });
});
