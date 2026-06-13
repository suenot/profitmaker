import { io, type Socket } from 'socket.io-client';
import { resolveServerBase, resolveServerToken } from '@/modules/api';
import { getSsoToken } from '@/services/ssoClient';
import { useDashboardStore } from '@/store/dashboardStore';
import { useGroupStore } from '@/store/groupStore';
import { useChartWidgetsStore } from '@/store/chartWidgetStore';
import { useOrderBookWidgetsStore } from '@/store/orderBookWidgetStore';
import { useTradesWidgetsStore } from '@/store/tradesWidgetStore';
import { useUserBalancesWidgetStore } from '@/store/userBalancesWidgetStore';
import { useUserTradingDataWidgetStore } from '@/store/userTradingDataWidgetStore';
import { GroupColors, type Group, type GroupColor } from '@/types/groups';
import type { Dashboard, Widget } from '@/types/dashboard';

/**
 * SyncBridge — makes the client a real-time mirror of the server's user state.
 *
 * The server is authoritative. On start we hydrate dashboards + groups from REST
 * (server wins; a one-time localStorage import seeds an empty server). A Socket.IO
 * connection then streams `state:changed` events which we apply into the existing
 * zustand stores under an `isApplyingRemote` guard so they don't echo back out.
 * Client-originated mutations write through to REST (see `track*` helpers, called
 * from the stores). If the backend is unreachable, the terminal behaves exactly as
 * before (localStorage only) — we just log and retry hydrate on reconnect.
 *
 * IDs: the server owns ids. After a create POST we reconcile the optimistic local
 * id to the server id so subsequent events line up.
 */

// ---- module-level state -------------------------------------------------------

let socket: Socket | null = null;
let started = false;
let online = false;
let clientId = '';
/** Highest state:changed rev we've applied, for dropping stale/duplicate events. */
let lastRev = 0;

/**
 * True while we are applying a remote change (hydrate or state:changed). Store
 * write-through helpers check this and skip REST calls to avoid echo loops.
 */
let applyingRemote = false;

export function isApplyingRemote(): boolean {
  return applyingRemote;
}

function withRemote<T>(fn: () => T): T {
  applyingRemote = true;
  try {
    return fn();
  } finally {
    applyingRemote = false;
  }
}

// ---- config resolution --------------------------------------------------------

const IMPORTED_FLAG = 'profitmaker.sync.imported';

function resolveBase(): string {
  return resolveServerBase();
}

/** Bearer token: SSO session (preferred), else ccxt-server provider, else
 *  localStorage override, else Vite env. The SSO token wins so an authenticated
 *  ecosystem user is scoped to their own server-side account. */
function resolveToken(): string | undefined {
  return (
    getSsoToken() ||
    resolveServerToken() ||
    (typeof localStorage !== 'undefined' ? localStorage.getItem('profitmaker.apiToken') || undefined : undefined) ||
    (import.meta.env.VITE_API_TOKEN as string | undefined)
  );
}

/** Socket.IO URL = HTTP base with port+1 (matches the server: 3001 → 3002). */
function deriveSocketUrl(base: string): string {
  try {
    const url = new URL(base);
    if (url.port) url.port = String(Number(url.port) + 1);
    return url.toString().replace(/\/$/, '');
  } catch {
    return base.replace(/\/$/, '');
  }
}

function authHeaders(token: string | undefined): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-Client-Id': clientId };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const base = resolveBase();
  const token = resolveToken();
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...authHeaders(token), ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ---- server-row <-> store-shape mappers --------------------------------------

interface ServerWidget {
  id: string;
  dashboardId: string;
  type: string;
  defaultTitle: string;
  userTitle: string | null;
  position: Widget['position'];
  preCollapsePosition?: Widget['position'] | null;
  config: Record<string, unknown>;
  groupId: string | null;
  showGroupSelector: boolean;
  isVisible: boolean;
  isMinimized: boolean;
}

interface ServerDashboard {
  id: string;
  title: string;
  description: string | null;
  layout: Dashboard['layout'];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  widgets?: ServerWidget[];
}

interface ServerGroup {
  id: string;
  name: string;
  color: string;
  tradingPair: string | null;
  account: string | null;
  exchange: string | null;
  market: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

function coerceColor(color: string): GroupColor {
  return (GroupColors as readonly string[]).includes(color) ? (color as GroupColor) : 'transparent';
}

function mapServerWidget(w: ServerWidget): Widget {
  return {
    id: w.id,
    type: w.type,
    title: w.userTitle || w.defaultTitle, // deprecated mirror
    defaultTitle: w.defaultTitle,
    userTitle: w.userTitle || undefined,
    position: w.position,
    preCollapsePosition: w.preCollapsePosition || undefined,
    config: w.config || {},
    groupId: w.groupId || undefined,
    showGroupSelector: w.showGroupSelector ?? true,
    isVisible: w.isVisible ?? true,
    isMinimized: w.isMinimized ?? false,
  };
}

function mapServerDashboard(d: ServerDashboard): Dashboard {
  return {
    id: d.id,
    title: d.title,
    description: d.description || undefined,
    widgets: (d.widgets || []).map(mapServerWidget),
    layout: d.layout || { gridSize: { width: 1920, height: 1080 }, snapToGrid: true, gridStep: 10 },
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    isDefault: d.isDefault ?? false,
  };
}

function mapServerGroup(g: ServerGroup): Group {
  return {
    id: g.id,
    name: g.name,
    color: coerceColor(g.color),
    tradingPair: g.tradingPair || undefined,
    account: g.account || undefined,
    exchange: g.exchange || undefined,
    market: g.market || undefined,
    description: g.description || undefined,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

// ---- hydrate ------------------------------------------------------------------

async function importLocalToServer(): Promise<void> {
  // One-time: server is empty but localStorage has data → push it up so the user
  // doesn't lose their existing local dashboards/groups on first connect.
  const localGroups = useGroupStore.getState().groups;
  const localDashboards = useDashboardStore.getState().dashboards;

  // Groups first (widgets reference groupIds). Remap local→server ids as we go.
  const groupIdMap = new Map<string, string>();
  for (const g of localGroups) {
    const { data } = await api<{ data: ServerGroup }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        name: g.name, color: g.color, tradingPair: g.tradingPair,
        account: g.account, exchange: g.exchange, market: g.market, description: g.description,
      }),
    });
    groupIdMap.set(g.id, data.id);
  }

  for (const d of localDashboards) {
    const { data: dash } = await api<{ data: ServerDashboard }>('/api/dashboards', {
      method: 'POST',
      body: JSON.stringify({ title: d.title, description: d.description, layout: d.layout, isDefault: d.isDefault }),
    });
    for (const w of d.widgets) {
      await api('/api/widgets', {
        method: 'POST',
        body: JSON.stringify({
          dashboardId: dash.id, type: w.type, defaultTitle: w.defaultTitle, userTitle: w.userTitle,
          position: w.position, config: w.config,
          groupId: w.groupId ? groupIdMap.get(w.groupId) ?? w.groupId : undefined,
          showGroupSelector: w.showGroupSelector, isVisible: w.isVisible,
        }),
      });
    }
  }

  localStorage.setItem(IMPORTED_FLAG, '1');
  console.log('[syncBridge] imported local state to empty server');
}

async function hydrate(): Promise<void> {
  const [dashResp, groupResp] = await Promise.all([
    api<{ data: ServerDashboard[] }>('/api/dashboards'),
    api<{ data: ServerGroup[] }>('/api/groups'),
  ]);

  const serverHasData = dashResp.data.length > 0 || groupResp.data.length > 0;
  const localHasData = useDashboardStore.getState().dashboards.length > 0 || useGroupStore.getState().groups.length > 0;

  if (!serverHasData && localHasData && !localStorage.getItem(IMPORTED_FLAG)) {
    await importLocalToServer();
    return hydrate(); // re-pull so store now holds server ids
  }

  if (!serverHasData) {
    console.log('[syncBridge] server empty, nothing to hydrate (offline-style start)');
    return;
  }

  // Server wins: replace store state. Each dashboard needs its widgets, so fetch
  // the detailed dashboard (list endpoint returns dashboards without widgets).
  const detailed = await Promise.all(
    dashResp.data.map((d) => api<{ data: ServerDashboard }>(`/api/dashboards/${d.id}`).then((r) => r.data))
  );

  withRemote(() => {
    useDashboardStore.setState((s) => {
      s.dashboards = detailed.map(mapServerDashboard);
      if (!s.activeDashboardId || !s.dashboards.some((d) => d.id === s.activeDashboardId)) {
        s.activeDashboardId = s.dashboards.find((d) => d.isDefault)?.id ?? s.dashboards[0]?.id;
      }
    });
    useGroupStore.setState((s) => ({
      groups: groupResp.data.map(mapServerGroup),
      selectedGroupId:
        s.selectedGroupId && groupResp.data.some((g) => g.id === s.selectedGroupId)
          ? s.selectedGroupId
          : groupResp.data.find((g) => coerceColor(g.color) === 'transparent')?.id ?? groupResp.data[0]?.id,
    }));
  });

  console.log(`[syncBridge] hydrated ${detailed.length} dashboard(s), ${groupResp.data.length} group(s) from server`);
}

// ---- apply remote state:changed ----------------------------------------------

interface StateChangedEvent {
  domain: 'dashboard' | 'widget' | 'group' | 'settings' | 'provider';
  action: 'created' | 'updated' | 'deleted';
  id: string;
  data: any;
  origin?: string;
  rev: number;
}

function applyStateChanged(evt: StateChangedEvent): void {
  // Drop our own echo and stale/duplicate events.
  if (evt.origin && evt.origin === clientId) return;
  if (evt.rev <= lastRev) return;
  lastRev = evt.rev;

  withRemote(() => {
    switch (evt.domain) {
      case 'dashboard':
        return applyDashboardEvent(evt);
      case 'widget':
        return applyWidgetEvent(evt);
      case 'group':
        return applyGroupEvent(evt);
      // settings / provider: not mirrored into a visible store in v1.
      default:
        return;
    }
  });
}

function applyDashboardEvent(evt: StateChangedEvent): void {
  useDashboardStore.setState((s) => {
    const idx = s.dashboards.findIndex((d) => d.id === evt.id);
    if (evt.action === 'deleted') {
      if (idx !== -1) s.dashboards.splice(idx, 1);
      if (s.activeDashboardId === evt.id) s.activeDashboardId = s.dashboards[0]?.id;
      return;
    }
    const incoming = mapServerDashboard(evt.data);
    if (idx === -1) {
      // Preserve existing widgets if the create event carried none.
      s.dashboards.push(incoming);
      s.activeDashboardId = incoming.id;
    } else {
      // Update metadata in place; keep current widgets (widget events manage those).
      const existing = s.dashboards[idx];
      existing.title = incoming.title;
      existing.description = incoming.description;
      existing.layout = incoming.layout;
      existing.isDefault = incoming.isDefault;
      existing.updatedAt = incoming.updatedAt;
    }
  });
}

function applyWidgetEvent(evt: StateChangedEvent): void {
  const dashboardId: string | undefined = evt.data?.dashboardId;
  useDashboardStore.setState((s) => {
    const dash = dashboardId
      ? s.dashboards.find((d) => d.id === dashboardId)
      : s.dashboards.find((d) => d.widgets.some((w) => w.id === evt.id));
    if (!dash) return;
    const idx = dash.widgets.findIndex((w) => w.id === evt.id);
    if (evt.action === 'deleted') {
      if (idx !== -1) dash.widgets.splice(idx, 1);
      return;
    }
    const incoming = mapServerWidget(evt.data);
    if (idx === -1) dash.widgets.push(incoming);
    else dash.widgets[idx] = incoming;
    dash.updatedAt = new Date().toISOString();
  });
}

function applyGroupEvent(evt: StateChangedEvent): void {
  useGroupStore.setState((s) => {
    const idx = s.groups.findIndex((g) => g.id === evt.id);
    if (evt.action === 'deleted') {
      return {
        groups: s.groups.filter((g) => g.id !== evt.id),
        selectedGroupId: s.selectedGroupId === evt.id ? s.groups.find((g) => g.color === 'transparent')?.id : s.selectedGroupId,
      };
    }
    const incoming = mapServerGroup(evt.data);
    const next = idx === -1 ? [...s.groups, incoming] : s.groups.map((g) => (g.id === evt.id ? incoming : g));
    return { groups: next };
  });
}

// ---- ui:command handler -------------------------------------------------------

interface UiCommand {
  id: string;
  type: string;
  payload: any;
}

function handleUiCommand(cmd: UiCommand): { ok: boolean; error?: string; data?: unknown } {
  try {
    switch (cmd.type) {
      case 'set_active_dashboard': {
        useDashboardStore.getState().setActiveDashboard(cmd.payload.dashboardId);
        return { ok: true };
      }
      case 'bring_widget_to_front': {
        useDashboardStore.getState().bringWidgetToFront(cmd.payload.dashboardId, cmd.payload.widgetId);
        return { ok: true };
      }
      case 'set_widget_settings': {
        applyWidgetSettings(cmd.payload.widgetId, cmd.payload.widgetType, cmd.payload.settings);
        return { ok: true };
      }
      case 'get_ui_state': {
        return { ok: true, data: getUiState() };
      }
      default:
        return { ok: false, error: `Unknown command '${cmd.type}'` };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Map a free-form per-widget settings payload to the right per-widget store. */
function applyWidgetSettings(widgetId: string, widgetType: string, settings: Record<string, unknown>): void {
  switch (widgetType) {
    case 'chart':
      useChartWidgetsStore.getState().updateWidget(widgetId, settings as any);
      break;
    case 'orderbook':
      useOrderBookWidgetsStore.getState().setWidgetSettings(widgetId, settings as any);
      break;
    case 'trades':
      useTradesWidgetsStore.getState().updateWidget(widgetId, settings as any);
      break;
    case 'userBalances':
      useUserBalancesWidgetStore.getState().setWidgetSettings(widgetId, settings as any);
      break;
    case 'userTradingData':
      useUserTradingDataWidgetStore.getState().setWidgetSettings(widgetId, settings as any);
      break;
    default:
      // Module widgets and anything without a dedicated store: merge into config.
      useDashboardStore.getState().updateWidgetConfig(widgetId, settings);
  }
}

function getUiState(): { activeDashboardId: string | undefined; widgets: Array<{ id: string; type: string }> } {
  const ds = useDashboardStore.getState();
  const active = ds.dashboards.find((d) => d.id === ds.activeDashboardId);
  return {
    activeDashboardId: ds.activeDashboardId,
    widgets: (active?.widgets || []).map((w) => ({ id: w.id, type: w.type })),
  };
}

// ---- write-through (called from store actions) -------------------------------

/**
 * Fire-and-forget REST write for a client-originated change. No-ops while
 * applying a remote change (avoids echo) and when offline (localStorage only).
 */
function write(path: string, method: string, body?: unknown): void {
  if (applyingRemote || !online) return;
  api(path, { method, body: body !== undefined ? JSON.stringify(body) : undefined }).catch((err) => {
    console.warn(`[syncBridge] write-through failed: ${method} ${path}`, err);
  });
}

// Debounced position writes for drag/resize (batched per widget).
const pendingPositions = new Map<string, Widget['position']>();
let positionTimer: ReturnType<typeof setTimeout> | null = null;

function flushPositions(): void {
  positionTimer = null;
  if (applyingRemote || !online || pendingPositions.size === 0) {
    pendingPositions.clear();
    return;
  }
  const widgets = Array.from(pendingPositions.entries()).map(([id, position]) => ({ id, position }));
  pendingPositions.clear();
  write('/api/widgets/batch', 'PUT', { widgets });
}

export const sync = {
  /** Persist a widget position change (move/resize); debounced + batched ~400ms. */
  widgetPosition(widgetId: string, position: Widget['position']): void {
    if (applyingRemote || !online) return;
    pendingPositions.set(widgetId, position);
    if (!positionTimer) positionTimer = setTimeout(flushPositions, 400);
  },
  widgetCreated(serverShape: Record<string, unknown>, localId: string): void {
    if (applyingRemote || !online) return;
    // Create on the server, then reconcile the optimistic local id to the server id.
    api<{ data: ServerWidget }>('/api/widgets', { method: 'POST', body: JSON.stringify(serverShape) })
      .then(({ data }) => reconcileWidgetId(localId, data.id))
      .catch((err) => console.warn('[syncBridge] widget create failed', err));
  },
  widgetUpdated(widgetId: string, body: Record<string, unknown>): void {
    write(`/api/widgets/${widgetId}`, 'PUT', body);
  },
  widgetRemoved(widgetId: string): void {
    write(`/api/widgets/${widgetId}`, 'DELETE');
  },
  dashboardCreated(body: Record<string, unknown>, localId: string): void {
    if (applyingRemote || !online) return;
    api<{ data: ServerDashboard }>('/api/dashboards', { method: 'POST', body: JSON.stringify(body) })
      .then(({ data }) => reconcileDashboardId(localId, data.id))
      .catch((err) => console.warn('[syncBridge] dashboard create failed', err));
  },
  dashboardUpdated(dashboardId: string, body: Record<string, unknown>): void {
    write(`/api/dashboards/${dashboardId}`, 'PUT', body);
  },
  dashboardRemoved(dashboardId: string): void {
    write(`/api/dashboards/${dashboardId}`, 'DELETE');
  },
  groupCreated(body: Record<string, unknown>, localId: string): void {
    if (applyingRemote || !online) return;
    api<{ data: ServerGroup }>('/api/groups', { method: 'POST', body: JSON.stringify(body) })
      .then(({ data }) => reconcileGroupId(localId, data.id))
      .catch((err) => console.warn('[syncBridge] group create failed', err));
  },
  groupUpdated(groupId: string, body: Record<string, unknown>): void {
    write(`/api/groups/${groupId}`, 'PUT', body);
  },
  groupRemoved(groupId: string): void {
    write(`/api/groups/${groupId}`, 'DELETE');
  },
  isOnline(): boolean {
    return online;
  },
};

function reconcileDashboardId(localId: string, serverId: string): void {
  if (localId === serverId) return;
  withRemote(() => {
    useDashboardStore.setState((s) => {
      const d = s.dashboards.find((x) => x.id === localId);
      if (d) d.id = serverId;
      if (s.activeDashboardId === localId) s.activeDashboardId = serverId;
    });
  });
}

function reconcileWidgetId(localId: string, serverId: string): void {
  if (localId === serverId) return;
  withRemote(() => {
    useDashboardStore.setState((s) => {
      for (const d of s.dashboards) {
        const w = d.widgets.find((x) => x.id === localId);
        if (w) { w.id = serverId; return; }
      }
    });
  });
}

function reconcileGroupId(localId: string, serverId: string): void {
  if (localId === serverId) return;
  withRemote(() => {
    useGroupStore.setState((s) => ({
      groups: s.groups.map((g) => (g.id === localId ? { ...g, id: serverId } : g)),
      selectedGroupId: s.selectedGroupId === localId ? serverId : s.selectedGroupId,
    }));
  });
}

// ---- lifecycle ----------------------------------------------------------------

function connectSocket(): void {
  const base = resolveBase();
  const token = resolveToken();
  const url = deriveSocketUrl(base);

  socket = io(url, { transports: ['websocket'], reconnection: true });

  socket.on('connect', () => socket?.emit('authenticate', { token }));

  socket.on('authenticated', async () => {
    online = true;
    console.log('[syncBridge] socket authenticated, hydrating');
    try {
      await hydrate();
    } catch (err) {
      console.warn('[syncBridge] hydrate failed (staying on local cache)', err);
    }
  });

  socket.on('auth_error', (e: { error?: string }) => {
    console.warn('[syncBridge] socket auth failed:', e?.error);
    online = false;
  });

  socket.on('state:changed', (evt: StateChangedEvent) => applyStateChanged(evt));

  socket.on('ui:command', (cmd: UiCommand) => {
    const result = handleUiCommand(cmd);
    socket?.emit('ui:command:result', { id: cmd.id, ...result });
  });

  socket.on('disconnect', () => {
    online = false;
    console.log('[syncBridge] socket disconnected (offline → localStorage only)');
  });

  // On reconnect, re-hydrate to catch up on anything missed while offline.
  socket.io.on('reconnect', async () => {
    console.log('[syncBridge] reconnected, re-hydrating');
    online = true;
    lastRev = 0;
    try {
      await hydrate();
    } catch (err) {
      console.warn('[syncBridge] re-hydrate failed', err);
    }
  });
}

/**
 * Start the sync bridge. Idempotent. Call once from main.tsx after initRuntime().
 * Safe to call even when the server is unreachable — the socket retries in the
 * background and the terminal keeps working off localStorage until it connects.
 */
export function start(): void {
  if (started) return;
  started = true;
  clientId =
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `c-${Date.now()}-${Math.random()}`);
  try {
    connectSocket();
  } catch (err) {
    console.warn('[syncBridge] failed to start (continuing offline)', err);
  }
}

export function getClientId(): string {
  return clientId;
}
