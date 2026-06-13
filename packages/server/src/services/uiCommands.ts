import type { Server as SocketIOServer, Socket } from 'socket.io';
import { userRoom } from './stateEvents';

export interface UiCommandResult {
  id: string;
  ok: boolean;
  /** Present when ok=false. */
  error?: string;
  /** Optional payload returned by the client (e.g. get_ui_state). */
  data?: unknown;
}

interface PendingCommand {
  resolve: (result: UiCommandResult) => void;
  timer: ReturnType<typeof setTimeout>;
}

let io: SocketIOServer | null = null;

/** In-flight commands awaiting a client ack, keyed by command id. */
const pending = new Map<string, PendingCommand>();

export function setUiCommandsIO(server: SocketIOServer): void {
  io = server;
}

/** Register the ui:command:result ack handler on a freshly connected socket. */
export function registerUiCommandSocket(socket: Socket): void {
  socket.on('ui:command:result', (result: UiCommandResult) => {
    if (!result || typeof result.id !== 'string') return;
    const entry = pending.get(result.id);
    if (!entry) return; // already resolved or timed out
    clearTimeout(entry.timer);
    pending.delete(result.id);
    entry.resolve({
      id: result.id,
      ok: !!result.ok,
      error: result.error,
      data: result.data,
    });
  });
}

/** Number of clients currently joined to a user's room. */
async function roomSize(userId: string): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(userRoom(userId)).fetchSockets();
  return sockets.length;
}

/**
 * Emit a ui:command to a user's room and await the first client's
 * ui:command:result ack. Resolves with { ok:false, error } when no client is
 * connected or the timeout elapses — the caller maps that to an HTTP error.
 */
export async function dispatchUiCommand(params: {
  userId: string;
  type: string;
  payload: unknown;
  timeoutMs?: number;
}): Promise<UiCommandResult> {
  const id = crypto.randomUUID();
  const timeoutMs = params.timeoutMs ?? 5000;

  if (!io) {
    return { id, ok: false, error: 'Socket.IO not initialized' };
  }

  const clients = await roomSize(params.userId);
  if (clients === 0) {
    return { id, ok: false, error: 'No UI client connected' };
  }

  return new Promise<UiCommandResult>((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      resolve({ id, ok: false, error: `ui:command timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    pending.set(id, { resolve, timer });

    io!.to(userRoom(params.userId)).emit('ui:command', {
      id,
      type: params.type,
      payload: params.payload,
    });
  });
}
