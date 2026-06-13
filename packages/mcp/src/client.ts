import { io, type Socket } from 'socket.io-client';

/**
 * Typed HTTP (+ optional Socket.IO) client for a running Profitmaker server.
 *
 * Both the MCP server and the CLI talk to the terminal through this one client,
 * so the command registry is transport-agnostic. Config comes from the
 * environment by default: PROFITMAKER_URL (HTTP base, default http://localhost:3001)
 * and PROFITMAKER_TOKEN (Bearer; the server's API_TOKEN resolves to the bootstrap
 * user, or pass a session/SSO token).
 */
export interface ApiClientOptions {
  baseUrl?: string;
  token?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  readonly baseUrl: string;
  private readonly token: string | undefined;
  private socket: Socket | null = null;

  constructor(opts: ApiClientOptions = {}) {
    this.baseUrl = (opts.baseUrl || process.env.PROFITMAKER_URL || 'http://localhost:3001').replace(/\/$/, '');
    this.token = opts.token ?? process.env.PROFITMAKER_TOKEN ?? undefined;
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
    if (this.token) h.Authorization = `Bearer ${this.token}`;
    return h;
  }

  /**
   * Issue a request and return the parsed JSON. On a non-2xx response throws an
   * ApiError carrying the status and the server's body — callers (and the MCP
   * tool layer) surface that verbatim so an agent sees the real error (a 503
   * "no UI client connected", a 400 zod message, etc.).
   */
  async request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new ApiError(
        `Cannot reach the Profitmaker server at ${this.baseUrl} (${err instanceof Error ? err.message : String(err)}). Is it running?`,
        0,
      );
    }
    const text = await res.text();
    let parsed: any = undefined;
    try {
      parsed = text ? JSON.parse(text) : undefined;
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      const msg = (parsed && typeof parsed === 'object' && (parsed.error || parsed.details)) || text || res.statusText;
      throw new ApiError(`${method} ${path} → ${res.status}: ${msg}`, res.status, parsed);
    }
    return parsed as T;
  }

  get<T = any>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  put<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }
  delete<T = any>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /** Lazily connect + authenticate a Socket.IO client (HTTP base port + 1). */
  async connectSocket(): Promise<Socket> {
    if (this.socket?.connected) return this.socket;
    const url = deriveSocketUrl(this.baseUrl);
    const socket = io(url, { transports: ['websocket'], reconnection: false });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('socket connect/auth timeout')), 5000);
      socket.on('connect', () => socket.emit('authenticate', { token: this.token }));
      socket.on('authenticated', () => { clearTimeout(timer); resolve(); });
      socket.on('auth_error', (e: { error?: string }) => { clearTimeout(timer); reject(new Error(e?.error || 'socket auth failed')); });
      socket.on('connect_error', (e: Error) => { clearTimeout(timer); reject(e); });
    });
    this.socket = socket;
    return socket;
  }

  closeSocket(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

/** Socket.IO URL = HTTP base with port+1 (matches the server: 3001 → 3002). */
export function deriveSocketUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.port) url.port = String(Number(url.port) + 1);
    return url.toString().replace(/\/$/, '');
  } catch {
    return baseUrl.replace(/\/$/, '');
  }
}
