import type { Server as SocketIOServer } from 'socket.io';

export type StateDomain = 'dashboard' | 'widget' | 'group' | 'settings' | 'provider';
export type StateAction = 'created' | 'updated' | 'deleted';

export interface StateChangedEvent {
  domain: StateDomain;
  action: StateAction;
  /** Primary id of the affected row (widget/dashboard/group/provider id, or settings key). */
  id: string;
  /** Full row after the mutation, or minimal identifying payload for deletes. */
  data: unknown;
  /** Optional client id (X-Client-Id header) of the writer, so it can ignore its own echo. */
  origin?: string;
  /** Monotonically increasing per-user revision; clients drop stale/duplicate events. */
  rev: number;
}

let io: SocketIOServer | null = null;

/** Per-user monotonic revision counter for state:changed ordering. */
const revByUser = new Map<string, number>();

/** Wire the Socket.IO server in once it exists (called from index.ts on boot). */
export function setStateEventsIO(server: SocketIOServer): void {
  io = server;
}

function nextRev(userId: string): number {
  const next = (revByUser.get(userId) ?? 0) + 1;
  revByUser.set(userId, next);
  return next;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Emit a state:changed event to a user's room after a successful mutation.
 *
 * Call this AFTER the DB write has committed and pass the full returned row in
 * `data`. `origin` should be the request's X-Client-Id header (if any) so the
 * originating client can suppress its own echo.
 */
export function emitStateChanged(params: {
  userId: string;
  domain: StateDomain;
  action: StateAction;
  id: string;
  data: unknown;
  origin?: string;
}): void {
  if (!io) return;
  const event: StateChangedEvent = {
    domain: params.domain,
    action: params.action,
    id: params.id,
    data: params.data,
    origin: params.origin,
    rev: nextRev(params.userId),
  };
  io.to(userRoom(params.userId)).emit('state:changed', event);
}

/** Read the X-Client-Id header (case-insensitive) from a request, if present. */
export function clientIdFromRequest(request: Request): string | undefined {
  return request.headers.get('x-client-id') || undefined;
}
