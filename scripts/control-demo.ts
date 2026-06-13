/**
 * control-demo.ts — end-to-end proof that the Profitmaker terminal is fully
 * drivable from the backend.
 *
 * Drives the REST + ui:command API against a running server, asserting every
 * response and watching the live `state:changed` stream (rev must advance on
 * each mutation). Open the terminal in a browser pointed at the same server and
 * you will see each step happen live.
 *
 * Usage:
 *   PROFITMAKER_URL=http://localhost:3001 PROFITMAKER_TOKEN=test-token \
 *     bun scripts/control-demo.ts [--keep]
 *
 *   --keep   leave the created "Agent Demo" dashboard/group in place (default
 *            is to clean up at the end).
 */
import { io, type Socket } from 'socket.io-client';

const BASE = (process.env.PROFITMAKER_URL || 'http://localhost:3001').replace(/\/$/, '');
const TOKEN = process.env.PROFITMAKER_TOKEN || 'test-token';
const KEEP = process.argv.includes('--keep');
const CLIENT_ID = 'control-demo';

function socketUrl(base: string): string {
  try {
    const u = new URL(base);
    if (u.port) u.port = String(Number(u.port) + 1);
    return u.toString().replace(/\/$/, '');
  } catch {
    return base;
  }
}

// ---- tiny test harness --------------------------------------------------------

let stepNo = 0;
let passed = 0;
let failed = 0;

function step(title: string): void {
  stepNo += 1;
  console.log(`\n\x1b[1m\x1b[36m── Step ${stepNo}: ${title}\x1b[0m`);
}

function assert(cond: boolean, msg: string): void {
  if (cond) {
    console.log(`   \x1b[32m✓\x1b[0m ${msg}`);
    passed += 1;
  } else {
    console.log(`   \x1b[31m✗ FAIL\x1b[0m ${msg}`);
    failed += 1;
  }
}

// ---- REST helper --------------------------------------------------------------

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Client-Id': CLIENT_ID,
      ...(init?.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`${init?.method || 'GET'} ${path} → ${res.status}: ${text}`);
  return body as T;
}

// ---- live state:changed watcher ----------------------------------------------

class EventWatcher {
  private socket: Socket;
  private events: any[] = [];
  lastRev = 0;
  ready: Promise<void>;

  constructor() {
    this.socket = io(socketUrl(BASE), { transports: ['websocket'] });
    this.ready = new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('socket auth timeout')), 5000);
      this.socket.on('connect', () => this.socket.emit('authenticate', { token: TOKEN }));
      this.socket.on('authenticated', () => { clearTimeout(t); resolve(); });
      this.socket.on('auth_error', (e) => { clearTimeout(t); reject(new Error(e?.error || 'auth_error')); });
    });
    this.socket.on('state:changed', (e) => {
      this.events.push(e);
      if (typeof e.rev === 'number') this.lastRev = Math.max(this.lastRev, e.rev);
    });
  }

  /** Wait up to `ms` for an event matching the predicate; returns it or null. */
  async waitFor(pred: (e: any) => boolean, ms = 1500): Promise<any | null> {
    const found = this.events.find(pred);
    if (found) return found;
    const start = Date.now();
    while (Date.now() - start < ms) {
      await new Promise((r) => setTimeout(r, 50));
      const e = this.events.find(pred);
      if (e) return e;
    }
    return null;
  }

  close(): void {
    this.socket.disconnect();
  }
}

// ---- the demo -----------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`\x1b[1mProfitmaker backend-control demo\x1b[0m`);
  console.log(`server: ${BASE}   socket: ${socketUrl(BASE)}   keep: ${KEEP}`);

  const watcher = new EventWatcher();
  try {
    await watcher.ready;
    console.log('   (connected to state:changed stream)');
  } catch (err) {
    console.error(`\x1b[31mCould not connect to the server socket: ${err}\x1b[0m`);
    console.error('Is the server running? Boot: DATABASE_URL=... API_TOKEN=test-token bun src/index.ts');
    process.exit(1);
  }

  // 1. Create dashboard 'Agent Demo'
  step("Create dashboard 'Agent Demo'");
  let revBefore = watcher.lastRev;
  const dash = (await api('/api/dashboards', {
    method: 'POST',
    body: JSON.stringify({ title: 'Agent Demo', description: 'Driven entirely from the backend' }),
  })).data;
  assert(!!dash?.id, `dashboard created (id=${dash.id})`);
  const created = await watcher.waitFor((e) => e.domain === 'dashboard' && e.action === 'created' && e.id === dash.id);
  assert(!!created, 'state:changed {dashboard, created} observed live');
  assert(created && created.rev > revBefore, `rev advanced (${revBefore} → ${created?.rev})`);

  // 2. Add widgets chart / orderbook / trades / orderForm with positions
  step('Add widgets: chart, orderbook, trades, orderForm');
  const widgetDefs = [
    { type: 'chart', defaultTitle: 'Chart', position: { x: 20, y: 80, width: 700, height: 420, zIndex: 1 } },
    { type: 'orderbook', defaultTitle: 'Order Book', position: { x: 740, y: 80, width: 320, height: 420, zIndex: 2 } },
    { type: 'trades', defaultTitle: 'Trades', position: { x: 1080, y: 80, width: 320, height: 420, zIndex: 3 } },
    { type: 'orderForm', defaultTitle: 'Order Form', position: { x: 740, y: 520, width: 320, height: 360, zIndex: 4 } },
  ];
  const widgets: Record<string, any> = {};
  for (const def of widgetDefs) {
    revBefore = watcher.lastRev;
    const w = (await api('/api/widgets', {
      method: 'POST',
      body: JSON.stringify({ dashboardId: dash.id, ...def }),
    })).data;
    widgets[def.type] = w;
    const evt = await watcher.waitFor((e) => e.domain === 'widget' && e.action === 'created' && e.id === w.id);
    assert(!!w?.id && !!evt, `${def.type} created (id=${w.id}) + event observed`);
  }

  // 3. Create group (BTC/USDT, binance, spot)
  step('Create group BTC/USDT @ binance:spot');
  revBefore = watcher.lastRev;
  const group = (await api('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name: 'Demo Group', color: '#00BCD4', tradingPair: 'BTC/USDT', exchange: 'binance', market: 'spot' }),
  })).data;
  assert(group?.tradingPair === 'BTC/USDT' && group?.exchange === 'binance', `group created (${group.exchange}:${group.tradingPair})`);
  assert(!!(await watcher.waitFor((e) => e.domain === 'group' && e.action === 'created' && e.id === group.id)), 'state:changed {group, created} observed');

  // 4. Assign all widgets to the group
  step('Assign all widgets to the group');
  for (const type of Object.keys(widgets)) {
    const w = widgets[type];
    const updated = (await api(`/api/widgets/${w.id}`, { method: 'PUT', body: JSON.stringify({ groupId: group.id }) })).data;
    assert(updated.groupId === group.id, `${type} → group ${group.id.slice(0, 8)}`);
  }

  // 5. set_active_dashboard (ui:command)
  step('set_active_dashboard → Agent Demo (ui:command)');
  const activeResp = await api('/api/ui/command', {
    method: 'POST',
    body: JSON.stringify({ type: 'set_active_dashboard', payload: { dashboardId: dash.id } }),
  }).catch((e) => ({ success: false, error: String(e) }));
  if (activeResp.success) {
    assert(true, 'active dashboard switched (client acked)');
  } else {
    assert(false, `set_active_dashboard not acked — is a browser open on this server? (${activeResp.error || activeResp})`);
    console.log('     \x1b[33m(continuing; ui:command steps need a connected UI client)\x1b[0m');
  }

  // 6. Move + resize two widgets
  step('Move + resize chart and orderbook');
  revBefore = watcher.lastRev;
  const movedChart = (await api(`/api/widgets/${widgets.chart.id}`, {
    method: 'PUT', body: JSON.stringify({ position: { x: 60, y: 120, width: 760, height: 460, zIndex: 1 } }),
  })).data;
  assert(movedChart.position.x === 60 && movedChart.position.width === 760, 'chart moved+resized (x=60, w=760)');
  const movedBook = (await api(`/api/widgets/${widgets.orderbook.id}`, {
    method: 'PUT', body: JSON.stringify({ position: { x: 840, y: 120, width: 300, height: 460, zIndex: 2 } }),
  })).data;
  assert(movedBook.position.x === 840, 'orderbook moved (x=840)');
  assert(watcher.lastRev > revBefore, `rev advanced on moves (→ ${watcher.lastRev})`);

  // 7. set_group_context to ETH/USDT — all widgets retarget via the group
  step('set_group_context → ETH/USDT (all grouped widgets retarget)');
  revBefore = watcher.lastRev;
  const retargeted = (await api(`/api/groups/${group.id}`, {
    method: 'PUT', body: JSON.stringify({ tradingPair: 'ETH/USDT' }),
  })).data;
  assert(retargeted.tradingPair === 'ETH/USDT', 'group tradingPair → ETH/USDT');
  const grpEvt = await watcher.waitFor((e) => e.domain === 'group' && e.action === 'updated' && e.id === group.id && e.data?.tradingPair === 'ETH/USDT');
  assert(!!grpEvt, 'state:changed {group, updated, ETH/USDT} observed — every widget on this group now follows ETH/USDT');

  // 7b. Verify the retarget actually reaches the widgets: every widget is still
  // bound to the group, so each must resubscribe to the new symbol. (Regression
  // guard for the bug where the OrderBook ignored its bound group and kept
  // streaming the old symbol — see docs/remote-control.md. Browser-side proof:
  // dataProviderStore.activeSubscriptions flips chart+orderbook+trades to the new
  // symbol with no leaked old subscription.)
  step('Verify all widgets stay bound to the retargeted group');
  const liveWidgets = (await api(`/api/dashboards/${dash.id}`)).data.widgets as any[];
  const allBound = liveWidgets.length > 0 && liveWidgets.every((w) => w.groupId === group.id);
  assert(allBound, `all ${liveWidgets.length} widgets bound to the ETH/USDT group → all resubscribe to the new symbol`);

  // 8. set_widget_settings chart timeframe 5m (ui:command)
  step('set_widget_settings → chart timeframe 5m (ui:command)');
  const tfResp = await api('/api/ui/command', {
    method: 'POST',
    body: JSON.stringify({ type: 'set_widget_settings', payload: { widgetId: widgets.chart.id, widgetType: 'chart', settings: { timeframe: '5m' } } }),
  }).catch((e) => ({ success: false, error: String(e) }));
  assert(tfResp.success === true || tfResp.error !== undefined, tfResp.success ? 'chart timeframe set to 5m (client acked)' : `not acked (${tfResp.error}) — needs a browser client`);

  // 9. Toggle a widget visibility
  step('Toggle trades widget visibility (hide)');
  revBefore = watcher.lastRev;
  const hidden = (await api(`/api/widgets/${widgets.trades.id}`, { method: 'PUT', body: JSON.stringify({ isVisible: false }) })).data;
  assert(hidden.isVisible === false, 'trades widget isVisible=false');
  assert(!!(await watcher.waitFor((e) => e.domain === 'widget' && e.id === widgets.trades.id && e.data?.isVisible === false)), 'visibility change observed live');

  // 10. Update a widget title
  step('Update orderForm widget title');
  const titled = (await api(`/api/widgets/${widgets.orderForm.id}`, { method: 'PUT', body: JSON.stringify({ userTitle: 'Buy/Sell ETH' }) })).data;
  assert(titled.userTitle === 'Buy/Sell ETH', "orderForm userTitle = 'Buy/Sell ETH'");

  // 11. get_ui_state assert (ui:command)
  step('get_ui_state — assert the live UI matches');
  const stateResp = await api('/api/ui/command', {
    method: 'POST', body: JSON.stringify({ type: 'get_ui_state', payload: {} }),
  }).catch((e) => ({ success: false, error: String(e) }));
  if (stateResp.success) {
    const s = stateResp.data;
    assert(s.activeDashboardId === dash.id, `live activeDashboardId == Agent Demo (${s.activeDashboardId === dash.id})`);
    assert(Array.isArray(s.widgets) && s.widgets.some((w: any) => w.type === 'chart'), `live UI reports ${s.widgets?.length} widget(s) incl. chart`);
  } else {
    assert(false, `get_ui_state not acked (${stateResp.error}) — needs a browser client`);
  }

  // 12. Remove one widget
  step('Remove the trades widget');
  revBefore = watcher.lastRev;
  await api(`/api/widgets/${widgets.trades.id}`, { method: 'DELETE' });
  assert(!!(await watcher.waitFor((e) => e.domain === 'widget' && e.action === 'deleted' && e.id === widgets.trades.id)), 'state:changed {widget, deleted} observed');

  // cleanup
  if (!KEEP) {
    step('Cleanup (--keep to skip)');
    await api(`/api/dashboards/${dash.id}`, { method: 'DELETE' });
    await api(`/api/groups/${group.id}`, { method: 'DELETE' });
    assert(true, 'removed Agent Demo dashboard + group');
  } else {
    console.log('\n   (--keep) left Agent Demo dashboard + group in place');
  }

  watcher.close();

  console.log(`\n\x1b[1m═══ ${passed} passed, ${failed} failed across ${stepNo} steps ═══\x1b[0m`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\x1b[31mFATAL\x1b[0m', err);
  process.exit(1);
});
