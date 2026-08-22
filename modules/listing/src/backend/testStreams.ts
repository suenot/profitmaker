/** Test helpers for faking SSE endpoints: build frames and byte streams. */

const encoder = new TextEncoder();

/** One SSE frame: `event: <name>` + single-line JSON `data`, terminated by a blank line. */
export function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** SSE comment frame (server heartbeat). */
export function sseComment(text = 'ping'): string {
  return `: ${text}\n\n`;
}

/**
 * A ReadableStream of encoded chunks. Enqueues every chunk eagerly and stays
 * OPEN (never closes) so the reader keeps waiting for more, like a live SSE body.
 */
export function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      // deliberately left open
    },
  });
}

/**
 * An open stream that emits `pings` heartbeat comments spaced `intervalMs`
 * apart on the (fake) timer clock. Used to prove the watchdog stays fed.
 * Timers stop after the last ping, so nothing enqueues after an abort.
 */
export function makeHeartbeatStream(intervalMs: number, pings: number): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const emit = () => controller.enqueue(encoder.encode(sseComment()));
      emit();
      for (let i = 1; i < pings; i += 1) setTimeout(emit, i * intervalMs);
    },
  });
}
