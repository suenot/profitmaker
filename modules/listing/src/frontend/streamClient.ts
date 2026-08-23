import type { ModuleListing, StreamFrameStatus } from '../shared/types';

/**
 * Per-user live stream client for the Live Listings widget.
 *
 * The module's socket push channel is gone; live data arrives over
 * `GET /api/modules/listing/stream` (SSE, authenticated by the terminal's
 * api.fetch so the session Bearer cookie/header rides along). The server
 * frames are `\n\n`-delimited:
 *
 *   event: hello\ndata: {"userId":...}
 *   event: listing\ndata: {...ModuleListing}
 *   event: status\ndata: {"state":"up"|"connecting"|"reconnecting"|"polling"|"expired"}
 *   : heartbeat
 *
 * This client owns the whole connection lifecycle: incremental frame parsing
 * over the response body reader, exponential-backoff reconnection
 * (1s→2s→4s…→60s cap, reset by any received frame — heartbeats included,
 * they prove the stream is alive), and a terminal distinction for 401/403
 * (sign-in / subscription problems never heal on their own, so no retry).
 */

/** Fetch shape the terminal hands to modules (`terminal.api.fetch`). */
export type StreamFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface ListingStreamError {
  /** HTTP status of the failing response; 0 for network/parse-level errors. */
  status: number;
  /** Body's `error` field when the server sent JSON, else a best-effort text. */
  message: string;
}

export interface SubscribeListingStreamOptions {
  url: string;
  /** Defaults to the global fetch; the widget passes `terminal.api.fetch`. */
  fetchImpl?: StreamFetch;
  onListing(listing: ModuleListing): void;
  onStatus(state: StreamFrameStatus): void;
  onError(error: ListingStreamError): void;
}

export interface ListingStreamSubscription {
  /** Stops the client: aborts the in-flight fetch, cancels the reader, clears any pending retry. Idempotent. */
  close(): void;
}

const FIRST_RETRY_MS = 1000;
const MAX_RETRY_MS = 60_000;
/** Statuses that mean "retrying cannot help" — the subscription is closed for good. */
const TERMINAL_STATUSES = new Set([401, 403]);

export function subscribeListingStream(opts: SubscribeListingStreamOptions): ListingStreamSubscription {
  const doFetch = opts.fetchImpl ?? ((url: string, init?: RequestInit) => fetch(url, init));
  let closed = false;
  /** Consecutive failed attempts; any received frame resets it to 0. */
  let attempt = 0;
  let controller: AbortController | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function close(): void {
    if (closed) return;
    closed = true;
    if (timer) { clearTimeout(timer); timer = null; }
    controller?.abort();
    // The abort should reject any pending read(); cancel anyway so the server
    // sees the disconnect even if the runtime does not propagate the signal.
    reader?.cancel().catch(() => {});
  }

  function scheduleRetry(): void {
    if (closed || timer) return;
    const delay = Math.min(FIRST_RETRY_MS * 2 ** attempt, MAX_RETRY_MS);
    attempt += 1;
    timer = setTimeout(() => {
      timer = null;
      void connect();
    }, delay);
  }

  async function connect(): Promise<void> {
    if (closed) return;
    controller = new AbortController();
    let res: Response;
    try {
      res = await doFetch(opts.url, { signal: controller.signal });
    } catch (err) {
      if (closed) return; // aborted by close(), not a failure
      opts.onError(networkError(err));
      scheduleRetry();
      return;
    }
    if (closed) return;
    if (!res.ok) {
      const message = await errorMessage(res);
      if (!closed) opts.onError({ status: res.status, message });
      if (!TERMINAL_STATUSES.has(res.status)) scheduleRetry();
      return;
    }
    if (!res.body) {
      opts.onError({ status: 0, message: 'stream response has no body' });
      scheduleRetry();
      return;
    }
    try {
      await readAll(res.body);
    } catch (err) {
      if (closed) return;
      opts.onError(networkError(err));
    }
    // The stream ended (server close, silent teardown after an "expired"
    // status frame, or a mid-stream transport error): reconnect with backoff.
    scheduleRetry();
  }

  async function readAll(body: ReadableStream<Uint8Array>): Promise<void> {
    const streamReader = body.getReader();
    reader = streamReader;
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await streamReader.read();
        if (done) break;
        if (closed) return;
        buffer = consume(buffer + decoder.decode(value, { stream: true }));
      }
    } finally {
      if (reader === streamReader) reader = null;
    }
  }

  /** Handle every complete frame in `text`; return the unparsed remainder. */
  function consume(text: string): string {
    let start = 0;
    while (true) {
      const idx = text.indexOf('\n\n', start);
      if (idx === -1) return text.slice(start);
      handleFrame(text.slice(start, idx));
      start = idx + 2;
    }
  }

  function handleFrame(frame: string): void {
    // Any complete frame — a heartbeat comment included — proves the
    // connection is alive, so the next reconnect (if any) starts from 1s.
    attempt = 0;
    const parsed = parseSseFrame(frame);
    if (!parsed) return;
    if (parsed.event === 'listing') {
      const data = parseJson(parsed.data);
      if (data && typeof data === 'object') opts.onListing(data as ModuleListing);
      else opts.onError({ status: 0, message: 'malformed listing frame data' });
    } else if (parsed.event === 'status') {
      // A status frame whose state is missing or not one of the protocol's
      // carries nothing actionable — ignore it rather than surfacing noise.
      const data = parseJson(parsed.data);
      const state = data && typeof data === 'object' ? (data as { state?: unknown }).state : undefined;
      if (isStreamFrameState(state)) opts.onStatus(state);
    }
    // hello and unknown events carry nothing the widget needs — ignored.
  }

  void connect();
  return { close };
}

/** Parse one SSE frame (the text between two `\n\n` boundaries). */
export function parseSseFrame(frame: string): { event: string; data: string } | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const line of frame.split('\n')) {
    if (line === '' || line.startsWith(':')) continue; // blank separator / comment
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1); // one optional space per the SSE spec
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

const STREAM_FRAME_STATES = new Set<string>(['connecting', 'up', 'reconnecting', 'polling', 'expired']);

/** Narrow a parsed status-frame state to the protocol union; unknown strings are noise. */
function isStreamFrameState(v: unknown): v is StreamFrameStatus {
  return typeof v === 'string' && STREAM_FRAME_STATES.has(v);
}

function parseJson(data: string): unknown {
  try {
    return JSON.parse(data) as unknown;
  } catch {
    return undefined;
  }
}

function networkError(err: unknown): ListingStreamError {
  return { status: 0, message: err instanceof Error ? err.message : String(err) };
}

/** Best-effort error message: the JSON body's `error` field, else the raw text. */
async function errorMessage(res: Response): Promise<string> {
  let text = '';
  try {
    text = await res.text();
  } catch {
    return `HTTP ${res.status}`;
  }
  const json = parseJson(text) as { error?: unknown } | undefined;
  if (json && typeof json === 'object' && typeof json.error === 'string') return json.error;
  return text.slice(0, 200) || `HTTP ${res.status}`;
}
