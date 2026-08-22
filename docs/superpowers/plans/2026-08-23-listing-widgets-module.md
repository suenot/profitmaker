# Listing Widgets Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `profitmaker-module-listing` — a Profitmaker terminal module with three widgets (Live Listings SSE feed, Trends, Stats) fed by a backend proxy to `https://api.listingapis.com`.

**Architecture:** One npm module (frontend bundle + Bun backend) following `templates/module-template`. Backend holds the single SSE connection + REST poller behind `/api/modules/listing/*` routes and pushes events over Socket.IO namespace `/m/listing`. Frontend widgets read REST cache + subscribe to pushes. MM API key stays server-side (env).

**Tech Stack:** TypeScript, React 18 (host runtime shims via `@profitmaker/module-sdk/vite`), Elysia (backend routes), Bun (build/runtime), Vitest (tests), plain fetch + ReadableStream (SSE client), Web Audio (alert beep).

**Spec:** `docs/superpowers/specs/2026-08-23-listing-widgets-module-design.md`

## Global Constraints

- Module id: `listing`. Widget types: `listing.live`, `listing.trends`, `listing.stats` (must match `/^[a-z][a-z0-9-]*\.[a-zA-Z][a-zA-Z0-9]*$/`).
- Package name: `profitmaker-module-listing`, unscoped, `keywords: ["profitmaker-module"]`, `files: ["dist", "package.json", "README.md"]`.
- Manifest permissions: `["network", "storage", "jobs"]`.
- Env: `LISTINGAPIS_API_KEY` (required at runtime), `LISTINGAPIS_API_URL` (default `https://api.listingapis.com`). Key never reaches the browser.
- No new runtime dependencies beyond the template's set (`elysia`, react/SDK as dev/peer). Tests: `vitest` devDep only.
- Upstream API: REST `GET /api/public/listings|trends|stats|exchanges`, SSE `GET /api/public/stream` (events `hello`, `listing`; comments `: heartbeat <ts>` ~25 s). Auth header `Authorization: Bearer <key>`. `402` = MM balance exhausted, `401` = invalid key.
- Source lives in `modules/listing/` in this repo; root `package.json` `workspaces` gains `"modules/*"`.
- Styles: own `src/frontend/style.css`, all selectors prefixed `.pm-lw-`, colors only via host CSS variables (`var(--terminal-*)`). No Tailwind inside the module bundle.
- Commits after every task; commit message prefix `feat(listing):` / `test(listing):` / `chore(listing):`.
- Test commands run from `modules/listing`: `bun run test` (vitest run), `bun run typecheck`, `bun run build`.

## File Structure

```
modules/listing/
├── package.json              # manifest + scripts (Task 1)
├── tsconfig.json             # Task 1
├── vite.config.ts            # Task 1
├── .gitignore                # Task 1 (node_modules, dist)
├── README.md                 # Task 12
├── src/
│   ├── shared/types.ts       # ModuleListing, TrendsData, StatsData, LiveConfig (Task 2)
│   ├── backend/
│   │   ├── apiClient.ts      # typed upstream REST client (Task 2)
│   │   ├── apiClient.test.ts
│   │   ├── normalize.ts      # stream/REST → ModuleListing (Task 4)
│   │   ├── normalize.test.ts
│   │   ├── ringBuffer.ts     # dedup ring of recent listings (Task 3)
│   │   ├── ringBuffer.test.ts
│   │   ├── sse.ts            # SSE client + polling fallback state machine (Task 5)
│   │   ├── sse.test.ts
│   │   ├── poller.ts         # trends/stats 5-min cache job (Task 6)
│   │   ├── poller.test.ts
│   │   ├── index.ts          # BackendModule wiring + routes (Task 7)
│   │   └── index.test.ts
│   └── frontend/
│       ├── lib.ts            # filters, time fmt, beep, store helpers (Task 8)
│       ├── lib.test.ts
│       ├── LiveListings.tsx  # Task 9
│       ├── LiveListingsSettings.tsx # Task 9
│       ├── Trends.tsx        # Task 10
│       ├── Stats.tsx         # Task 11
│       ├── index.tsx         # defineModule + widget defs (Task 9-11 grow it, final Task 12)
│       └── style.css
packages/client/src/modules/resolveIcon.tsx   # add Zap icon (Task 12)
docs/superpowers/plans/2026-08-23-listing-widgets-module.md  # this file
```

---

### Task 1: Scaffold module workspace

**Files:**
- Create: `modules/listing/package.json`, `modules/listing/tsconfig.json`, `modules/listing/vite.config.ts`, `modules/listing/.gitignore`, `modules/listing/src/frontend/index.tsx`, `modules/listing/src/frontend/style.css`, `modules/listing/src/backend/index.ts`
- Modify: `package.json` (root, workspaces)

**Interfaces:**
- Produces: buildable empty module `id: 'listing'`; workspaces glob `modules/*`.

- [ ] **Step 1: Create `modules/listing/package.json`**

```json
{
  "name": "profitmaker-module-listing",
  "version": "0.1.0",
  "description": "ListingAPIs widgets for the Profitmaker terminal: live listing feed (SSE), trends, stats",
  "type": "module",
  "license": "MIT",
  "keywords": ["profitmaker-module"],
  "files": ["dist", "package.json", "README.md"],
  "scripts": {
    "build": "bun run build:frontend && bun run build:backend",
    "build:frontend": "vite build",
    "build:backend": "bun build src/backend/index.ts --target=bun --outdir dist/backend",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "profitmaker": {
    "manifestVersion": 1,
    "id": "listing",
    "displayName": "ListingAPIs",
    "description": "Live exchange listing feed, trends and stats from ListingAPIs",
    "minTerminalApi": ">=1.0.0",
    "permissions": ["network", "storage", "jobs"],
    "frontend": {
      "entry": "dist/frontend/index.js",
      "style": "dist/frontend/style.css",
      "widgets": [
        { "type": "listing.live", "title": "Live Listings", "category": "modules" },
        { "type": "listing.trends", "title": "Listing Trends", "category": "modules" },
        { "type": "listing.stats", "title": "Listing Stats", "category": "modules" }
      ]
    },
    "backend": {
      "entry": "dist/backend/index.js",
      "routes": ["/listings/recent", "/trends", "/stats", "/exchanges", "/status"],
      "services": ["sse", "poller"]
    }
  },
  "peerDependencies": {
    "react": "^18.0.0"
  },
  "devDependencies": {
    "@profitmaker/module-sdk": "workspace:*",
    "@types/react": "^18.3.0",
    "elysia": "^1.3.0",
    "react": "^18.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Root `package.json` workspaces**

Change `"workspaces": ["packages/*", "templates/*"]` to `"workspaces": ["packages/*", "templates/*", "modules/*"]`.

- [ ] **Step 3: `modules/listing/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 4: `modules/listing/vite.config.ts`** (identical to template's)

```ts
import { defineConfig } from 'vite';
import { profitmakerModule } from '@profitmaker/module-sdk/vite';

export default defineConfig(profitmakerModule());
```

- [ ] **Step 5: `modules/listing/.gitignore`**

```
node_modules
dist
```

- [ ] **Step 6: Placeholder `src/frontend/index.tsx`**

```tsx
import { defineModule } from '@profitmaker/module-sdk';

export default defineModule({ id: 'listing', widgets: [] });
```

- [ ] **Step 7: Placeholder `src/frontend/style.css`**

```css
/* ListingAPIs module styles — selectors prefixed .pm-lw- */
```

- [ ] **Step 8: Placeholder `src/backend/index.ts`**

```ts
import type { BackendModule } from '@profitmaker/module-sdk';

const moduleDefinition: BackendModule = {
  async start() {
    // wired in a later task
  },
};

export default moduleDefinition;
```

- [ ] **Step 9: Install + verify**

Run from repo root: `bun install`, then `cd modules/listing && bun run typecheck && bun run build`.
Expected: both pass; `dist/frontend/index.js`, `dist/frontend/style.css`, `dist/backend/index.js` exist.

- [ ] **Step 10: Commit**

```bash
git add modules/listing package.json bun.lockb
git commit -m "chore(listing): scaffold profitmaker-module-listing workspace"
```

---

### Task 2: Shared types + upstream API client

**Files:**
- Create: `modules/listing/src/shared/types.ts`, `modules/listing/src/backend/apiClient.ts`
- Test: `modules/listing/src/backend/apiClient.test.ts`

**Interfaces:**
- Produces (used by all later tasks):
  - `ModuleListing` (see code below) — canonical listing event shape on routes/socket
  - `ListingApi` — `createListingApi(opts): { getListings(limit: number): Promise<ModuleListing[]>; getTrends(): Promise<TrendsData>; getStats(): Promise<StatsData>; getExchanges(): Promise<string[]> }`
  - Errors: `MissingKeyError`, `AuthError`, `BillingError`, `UpstreamError` (all `extends Error` with `.status?: number`)
  - `TrendsData`, `StatsData` — pass-through mirrors of upstream JSON (typed below)

- [ ] **Step 1: Write `src/shared/types.ts`**

```ts
/** Canonical listing shape used everywhere inside the module (routes, socket, widgets). */
export interface ModuleListing {
  id: number;
  exchange: string;
  symbol: string;
  fullName: string;
  /** normalized: 'listing' | 'new-pair' (upstream: 'Listing' | 'New Pair' | 'listing') */
  type: 'listing' | 'new-pair';
  title: string;
  url: string | null;
  listedAt: string | null;
  detectedAt: string | null;
  source: string | null;
}

export interface TrendingTicker {
  rank: number;
  ticker_symbol: string;
  ticker_full_name: string;
  listings_count: number;
  exchanges_count: number;
  cex_count?: number;
  dex_count?: number;
  pairs_count: number;
  first_listing_date: string;
  last_listing_date: string;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendingExchange {
  rank: number;
  exchange_id: number;
  exchange_name: string;
  exchange_slug: string;
  listings_count: number;
  unique_tickers: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface TrendsData {
  trending_tickers: { last_7_days: TrendingTicker[]; last_30_days: TrendingTicker[] };
  trending_exchanges: { last_7_days: TrendingExchange[]; last_30_days: TrendingExchange[] };
  metadata: { last_updated: string; [k: string]: unknown };
}

export interface ActivityPeriod {
  new_listings: number;
  new_pairs: number;
  active_exchanges: number;
  top_exchange: string;
  top_exchange_listings: number;
}

export interface StatsData {
  global_stats: {
    total_tickers: number;
    total_exchanges: number;
    total_pairs: number;
    total_listings: number;
    last_updated: string;
  };
  activity_stats: { last_24_hours: ActivityPeriod; last_7_days: ActivityPeriod; last_30_days: ActivityPeriod };
  pair_stats: { most_common_quote_currencies: { quote: string; count: number }[] };
}

export type SseStatus = 'connecting' | 'up' | 'reconnecting' | 'polling';

/** Widget config for listing.live (persisted via widget `config`). */
export interface LiveConfig {
  exchanges?: string[];
  types?: ('listing' | 'new-pair')[];
  sound?: boolean;
  toast?: boolean;
  autoRestore?: boolean;
}
```

- [ ] **Step 2: Write failing test `src/backend/apiClient.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import {
  AuthError, BillingError, MissingKeyError, UpstreamError, createListingApi,
} from './apiClient';
import type { ModuleListing } from '../shared/types';

const A_LISTING: ModuleListing = {
  id: 1, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin',
  type: 'listing', title: 'DOGE listed', url: null,
  listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:00Z', source: 'binance-ann',
};

function apiWith(status: number, body: unknown, headers: Record<string, string> = {}) {
  const fetchImpl = vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } }));
  return { api: createListingApi({ baseUrl: 'https://api.test', apiKey: 'k', fetchImpl }), fetchImpl };
}

describe('createListingApi', () => {
  it('throws MissingKeyError without a key', () => {
    expect(() => createListingApi({ baseUrl: 'https://api.test', apiKey: null, fetchImpl: vi.fn() }))
      .toThrow(MissingKeyError);
  });

  it('sends Bearer auth and normalizes listings', async () => {
    const { api, fetchImpl } = apiWith(200, {
      listings: [{
        id: 1, exchange_name: 'binance', ticker_symbol: 'DOGE', ticker_full_name: 'Dogecoin',
        type: 'Listing', title: 'DOGE listed', pairs: [{ pair: 'DOGE/USDT', url: 'https://x' }],
        listing_date: '2026-08-23T10:00:00Z', created_at: '2026-08-23T09:59:00Z',
      }],
    });
    const out = await api.getListings(10);
    expect(out).toEqual([A_LISTING]);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/public/listings?limit=10');
  });

  it('maps 402 to BillingError', async () => {
    const { api } = apiWith(402, { error: 'balance' });
    await expect(api.getTrends()).rejects.toBeInstanceOf(BillingError);
  });

  it('maps 401 to AuthError', async () => {
    const { api } = apiWith(401, { error: 'nope' });
    await expect(api.getTrends()).rejects.toBeInstanceOf(AuthError);
  });

  it('maps 500 and network failure to UpstreamError', async () => {
    const { api } = apiWith(500, { error: 'boom' });
    await expect(api.getStats()).rejects.toBeInstanceOf(UpstreamError);
    const failing = createListingApi({
      baseUrl: 'https://api.test', apiKey: 'k',
      fetchImpl: vi.fn(async () => { throw new Error('network down'); }),
    });
    await expect(failing.getStats()).rejects.toBeInstanceOf(UpstreamError);
  });

  it('getExchanges returns slug list', async () => {
    const { api } = apiWith(200, { exchanges: [{ slug: 'binance' }, { slug: 'bybit' }] });
    expect(await api.getExchanges()).toEqual(['binance', 'bybit']);
  });
});
```

(Add `import { vi } from 'vitest'` or rely on globals — `vitest.config` not needed; use explicit imports.)

- [ ] **Step 3: Run test, verify it fails**

Run: `cd modules/listing && bun run test`
Expected: FAIL — `Cannot find module './apiClient'`.

- [ ] **Step 4: Write `src/backend/apiClient.ts`**

```ts
import type { ModuleListing, StatsData, TrendsData } from '../shared/types';

export class MissingKeyError extends Error {
  constructor() { super('LISTINGAPIS_API_KEY is not configured'); this.name = 'MissingKeyError'; }
}
export class AuthError extends Error {
  constructor() { super('Invalid LISTINGAPIS_API_KEY'); this.name = 'AuthError'; }
}
export class BillingError extends Error {
  constructor() { super('MM balance exhausted'); this.name = 'BillingError'; }
}
export class UpstreamError extends Error {
  constructor(msg: string, public status?: number) { super(msg); this.name = 'UpstreamError'; }
}

/** Raw upstream REST shapes (snake_case). */
interface RestListing {
  id: number;
  exchange_name: string;
  ticker_symbol: string;
  ticker_full_name: string;
  type: string;
  title: string;
  pairs?: { pair: string; url: string }[];
  listing_date: string;
  created_at: string;
}

export interface ListingApiOptions {
  baseUrl: string;
  apiKey: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface ListingApi {
  getListings(limit: number): Promise<ModuleListing[]>;
  getTrends(): Promise<TrendsData>;
  getStats(): Promise<StatsData>;
  getExchanges(): Promise<string[]>;
}

export function createListingApi(opts: ListingApiOptions): ListingApi {
  if (!opts.apiKey) throw new MissingKeyError();
  const doFetch = opts.fetchImpl ?? fetch;
  const timeout = opts.timeoutMs ?? 10_000;

  async function getJson<T>(path: string): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(`${opts.baseUrl}${path}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(timeout),
      });
    } catch (err) {
      throw new UpstreamError(err instanceof Error ? err.message : String(err));
    }
    if (res.status === 402) throw new BillingError();
    if (res.status === 401) throw new AuthError();
    if (!res.ok) throw new UpstreamError(`upstream ${res.status}`, res.status);
    return (await res.json()) as T;
  }

  return {
    async getListings(limit) {
      const data = await getJson<{ listings: RestListing[] }>(`/api/public/listings?limit=${limit}&order=desc`);
      return data.listings.map(normalizeRestListing);
    },
    getTrends: () => getJson<TrendsData>('/api/public/trends'),
    getStats: () => getJson<StatsData>('/api/public/stats'),
    async getExchanges() {
      const data = await getJson<{ exchanges: { slug: string }[] }>('/api/public/exchanges');
      return data.exchanges.map((e) => e.slug);
    },
  };
}

export function normalizeRestListing(r: RestListing): ModuleListing {
  return {
    id: r.id,
    exchange: r.exchange_name,
    symbol: r.ticker_symbol,
    fullName: r.ticker_full_name,
    type: r.type === 'New Pair' ? 'new-pair' : 'listing',
    title: r.title,
    url: r.pairs?.[0]?.url ?? null,
    listedAt: r.listing_date ?? null,
    detectedAt: r.created_at ?? null,
    source: null,
  };
}
```

Note: if upstream ignores `order=desc` (listings default to newest-first per API), `getListings` still works — the ring buffer orders by insertion. Verify direction against live API once and drop the param if unsupported.

- [ ] **Step 5: Run tests, verify pass**

Run: `bun run test` — Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): upstream API client with typed errors"
```

---

### Task 3: Listing ring buffer

**Files:**
- Create: `modules/listing/src/backend/ringBuffer.ts`
- Test: `modules/listing/src/backend/ringBuffer.test.ts`

**Interfaces:**
- Produces: `createListingRing(max = 100): ListingRing` where

```ts
interface ListingRing {
  /** returns true when the listing was new (false = duplicate id) */
  add(listing: ModuleListing): boolean;
  /** newest first */
  recent(limit?: number): ModuleListing[];
  has(id: number): boolean;
  size(): number;
}
```

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createListingRing } from './ringBuffer';
import type { ModuleListing } from '../shared/types';

const mk = (id: number): ModuleListing => ({
  id, exchange: 'e', symbol: `S${id}`, fullName: `Sym ${id}`, type: 'listing',
  title: `t${id}`, url: null, listedAt: null, detectedAt: null, source: null,
});

describe('createListingRing', () => {
  it('adds and returns newest-first', () => {
    const ring = createListingRing();
    expect(ring.add(mk(1))).toBe(true);
    expect(ring.add(mk(2))).toBe(true);
    expect(ring.recent()).toEqual([mk(2), mk(1)]);
  });
  it('dedups by id', () => {
    const ring = createListingRing();
    ring.add(mk(1));
    expect(ring.add(mk(1))).toBe(false);
    expect(ring.size()).toBe(1);
  });
  it('caps at max, evicting oldest', () => {
    const ring = createListingRing(3);
    for (const id of [1, 2, 3, 4]) ring.add(mk(id));
    expect(ring.size()).toBe(3);
    expect(ring.has(1)).toBe(false);
    expect(ring.recent()).toEqual([mk(4), mk(3), mk(2)]);
  });
  it('recent(limit) slices', () => {
    const ring = createListingRing();
    ring.add(mk(1)); ring.add(mk(2)); ring.add(mk(3));
    expect(ring.recent(2)).toEqual([mk(3), mk(2)]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL** (`Cannot find module './ringBuffer'`).

- [ ] **Step 3: Implementation**

```ts
import type { ModuleListing } from '../shared/types';

export interface ListingRing {
  add(listing: ModuleListing): boolean;
  recent(limit?: number): ModuleListing[];
  has(id: number): boolean;
  size(): number;
}

/** New-to-old in-memory list of recent listings with id dedup and size cap. */
export function createListingRing(max = 100): ListingRing {
  const items: ModuleListing[] = [];
  const ids = new Set<number>();
  return {
    add(listing) {
      if (ids.has(listing.id)) return false;
      items.unshift(listing);
      ids.add(listing.id);
      if (items.length > max) {
        const evicted = items.pop();
        if (evicted) ids.delete(evicted.id);
      }
      return true;
    },
    recent(limit) {
      return limit == null ? [...items] : items.slice(0, limit);
    },
    has: (id) => ids.has(id),
    size: () => items.length,
  };
}
```

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): dedup ring buffer for recent listings"
```

---

### Task 4: Stream-event normalizer

**Files:**
- Create: `modules/listing/src/backend/normalize.ts`
- Test: `modules/listing/src/backend/normalize.test.ts`

**Interfaces:**
- Consumes: `ModuleListing` from Task 2.
- Produces: `normalizeStreamEvent(raw: unknown): ModuleListing | null` — parses the SSE `listing` payload (`{ id, exchange, symbol, type, title, url, listedAt, detectedAt, source }`, camelCase, `type` one of `listing|delisting|warning` per docs; also tolerate REST-style snake_case). Returns `null` for unusable payloads (no id / wrong shape). Non-`listing` types (delisting/warning) still normalize — `type` field keeps upstream value only when it is `new-pair`/`listing`, otherwise maps to `'listing'` (feed filter is by type string; keep a `rawType` on the title when non-listing? No — YAGNI: docs say stream filter `?type=listing` is applied server-side by our SSE URL).

SSE URL used by the service: `/api/public/stream?type=listing` so upstream filters; normalizer only maps shapes.

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeStreamEvent } from './normalize';

describe('normalizeStreamEvent', () => {
  it('maps camelCase stream payload', () => {
    expect(normalizeStreamEvent({
      id: 7, exchange: 'bybit', symbol: 'PEPE', type: 'listing',
      title: 'PEPE listed', url: 'https://bybit.com/x',
      listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:59Z', source: 'tg',
    })).toEqual({
      id: 7, exchange: 'bybit', symbol: 'PEPE', fullName: 'PEPE', type: 'listing',
      title: 'PEPE listed', url: 'https://bybit.com/x',
      listedAt: '2026-08-23T10:00:00Z', detectedAt: '2026-08-23T09:59:59Z', source: 'tg',
    });
  });
  it('maps new-pair type', () => {
    const out = normalizeStreamEvent({ id: 8, exchange: 'e', symbol: 'S', type: 'new-pair', title: 't' });
    expect(out?.type).toBe('new-pair');
  });
  it('maps REST-style snake_case payload', () => {
    const out = normalizeStreamEvent({
      id: 9, exchange_name: 'okx', ticker_symbol: 'WIF', ticker_full_name: 'dogwifhat',
      type: 'New Pair', title: 'WIF pair', listing_date: '2026-08-23T10:00:00Z', created_at: '2026-08-23T09:58:00Z',
    });
    expect(out).toMatchObject({ id: 9, exchange: 'okx', symbol: 'WIF', fullName: 'dogwifhat', type: 'new-pair' });
  });
  it('returns null for garbage', () => {
    expect(normalizeStreamEvent(null)).toBeNull();
    expect(normalizeStreamEvent({ nope: 1 })).toBeNull();
    expect(normalizeStreamEvent('x')).toBeNull();
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementation**

```ts
import type { ModuleListing } from '../shared/types';

type Rec = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

/** Parse an SSE `listing` payload (camelCase or REST snake_case) into ModuleListing. */
export function normalizeStreamEvent(raw: unknown): ModuleListing | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Rec;
  const id = typeof r.id === 'number' ? r.id : null;
  if (id === null) return null;
  const rawType = str(r.type);
  const type: ModuleListing['type'] = rawType === 'new-pair' || rawType === 'New Pair' ? 'new-pair' : 'listing';
  return {
    id,
    exchange: str(r.exchange) ?? str(r.exchange_name) ?? '?',
    symbol: str(r.symbol) ?? str(r.ticker_symbol) ?? '?',
    fullName: str(r.fullName) ?? str(r.ticker_full_name) ?? str(r.symbol) ?? str(r.ticker_symbol) ?? '?',
    type,
    title: str(r.title) ?? `${str(r.symbol) ?? str(r.ticker_symbol) ?? '?'} listing`,
    url: str(r.url),
    listedAt: str(r.listedAt) ?? str(r.listing_date),
    detectedAt: str(r.detectedAt) ?? str(r.created_at),
    source: str(r.source),
  };
}
```

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): stream event normalizer"
```

---

### Task 5: SSE service with polling fallback

**Files:**
- Create: `modules/listing/src/backend/sse.ts`
- Test: `modules/listing/src/backend/sse.test.ts`

**Interfaces:**
- Consumes: `ListingApi` (Task 2), `ListingRing` (Task 3), `normalizeStreamEvent` (Task 4), `SseStatus` (Task 2).
- Produces:

```ts
interface SseService {
  start(): void;
  stop(): void;
  /** One-shot REST backfill into the ring (call once at startup). */
  backfill(limit?: number): Promise<void>;
  getStatus(): { status: SseStatus; lastEventAt: number | null; lastError: string | null };
}

function createSseService(deps: {
  baseUrl: string;
  apiKey: string;
  api: Pick<ListingApi, 'getListings'>;
  ring: ListingRing;
  onListing: (listing: ModuleListing) => void;   // fired only for NEW ids
  onStatus: (status: SseStatus) => void;         // fired on every transition
  fetchImpl?: typeof fetch;
  heartbeatTimeoutMs?: number;  // default 45_000
  pollIntervalMs?: number;      // default 30_000
  maxBackoffMs?: number;        // default 60_000
}): SseService
```

Behavior spec (tests must cover each):
1. `start()` → status `connecting`, opens `GET {baseUrl}/api/public/stream?type=listing` with `Authorization: Bearer` + `Accept: text/event-stream`. On first successful frame → status `up`, `consecutiveFailures = 0`.
2. Frame parsing: buffer bytes → decode → split on `\n\n` → per-frame lines: ignore `: comment` (heartbeat — resets watchdog), `event: <name>` sets frame event, `data: <json>` accumulates. Frame with event `listing` → `normalizeStreamEvent` → if `ring.add` returns true → `onListing`. `hello` event ignored.
3. Watchdog: any traffic resets a `heartbeatTimeoutMs` timer; timer fire aborts the connection and counts as failure.
4. Failure handling: stream error/abort/non-200 response → `consecutiveFailures++`, status `reconnecting`, retry after `min(1000 * 2^(failures-1), maxBackoffMs)`.
5. After 2 consecutive failures → status `polling`: every `pollIntervalMs` call `api.getListings(10)`, for each listing `ring.add` → `onListing` when new; simultaneously retry SSE every `maxBackoffMs`. When SSE connects again → stop polling, status `up`, failures reset.
6. `stop()` aborts fetch, clears all timers. `backfill(limit=100)` uses `api.getListings` and `ring.add` (no `onListing`).

- [ ] **Step 1: Failing test** — with `vi.useFakeTimers()`, a `makeStream(chunks: string[])` helper building a `ReadableStream<Uint8Array>` that enqueues encoded chunks then closes, and a `fetchImpl` stub switchable per-URL/per-call. Cover: happy path up+listing event; heartbeat keeps alive (advance 40 s, no reconnect; advance past 45 s → failure); two failures → polling emits REST listings; SSE recovery returns to `up`; dedup via ring (same id twice → one `onListing`); `stop()` clears timers (`vi.getTimerCount() === 0`).

Test skeleton (implement all cases listed above; this is the shape):

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSseService } from './sse';
import { createListingRing } from './ringBuffer';
import type { ModuleListing } from '../shared/types';

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) { for (const c of chunks) controller.enqueue(enc.encode(c)); /* leave open */ },
  });
}
const LISTING = (id: number): ModuleListing => ({
  id, exchange: 'e', symbol: `S${id}`, fullName: `S${id}`, type: 'listing',
  title: `t${id}`, url: null, listedAt: null, detectedAt: null, source: 's',
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// happy path
it('goes up and emits listing events', async () => {
  const seen: ModuleListing[] = [];
  const statuses: string[] = [];
  const svc = createSseService({
    baseUrl: 'https://api.test', apiKey: 'k',
    api: { getListings: vi.fn(async () => []) },
    ring: createListingRing(),
    onListing: (l) => seen.push(l),
    onStatus: (s) => statuses.push(s),
    fetchImpl: vi.fn(async () => new Response(makeStream([
      sseFrame('hello', { ok: true }),
      sseFrame('listing', { id: 5, exchange: 'binance', symbol: 'DOGE', type: 'listing', title: 'x' }),
    ]), { status: 200 })),
  });
  svc.start();
  await vi.advanceTimersByTimeAsync(0);
  expect(statuses).toContain('up');
  expect(seen.map((l) => l.id)).toEqual([5]);
  svc.stop();
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementation** (`src/backend/sse.ts`). Key mechanics:

```ts
import type { ModuleListing, SseStatus } from '../shared/types';
import type { ListingApi } from './apiClient';
import type { ListingRing } from './ringBuffer';
import { normalizeStreamEvent } from './normalize';

export interface SseService { start(): void; stop(): void; backfill(limit?: number): Promise<void>;
  getStatus(): { status: SseStatus; lastEventAt: number | null; lastError: string | null }; }

export function createSseService(deps: {
  baseUrl: string; apiKey: string;
  api: Pick<ListingApi, 'getListings'>;
  ring: ListingRing;
  onListing: (listing: ModuleListing) => void;
  onStatus: (status: SseStatus) => void;
  fetchImpl?: typeof fetch;
  heartbeatTimeoutMs?: number; pollIntervalMs?: number; maxBackoffMs?: number;
}): SseService {
  const doFetch = deps.fetchImpl ?? fetch;
  const heartbeatTimeoutMs = deps.heartbeatTimeoutMs ?? 45_000;
  const pollIntervalMs = deps.pollIntervalMs ?? 30_000;
  const maxBackoffMs = deps.maxBackoffMs ?? 60_000;
  let status: SseStatus = 'connecting';
  let failures = 0;
  let lastEventAt: number | null = null;
  let lastError: string | null = null;
  let stopped = false;
  let controller: AbortController | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function setStatus(s: SseStatus) { if (status !== s) { status = s; deps.onStatus(s); } }
  function later(ms: number, fn: () => void) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; }

  function resetWatchdog() {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => fail('heartbeat timeout'), heartbeatTimeoutMs);
  }

  function fail(reason: string) {
    if (controller) { controller.abort(); controller = null; }
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
    lastError = reason;
    failures += 1;
    if (failures >= 2) { startPolling(); setStatus('polling'); later(maxBackoffMs, connect); }
    else { setStatus('reconnecting'); later(Math.min(1000 * 2 ** (failures - 1), maxBackoffMs), connect); }
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      try {
        for (const l of await deps.api.getListings(10)) emitIfNew(l);
      } catch { /* keep last good state; next tick retries */ }
    }, pollIntervalMs);
  }
  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function emitIfNew(l: ModuleListing) { if (deps.ring.add(l)) { lastEventAt = Date.now(); deps.onListing(l); } }

  async function connect() {
    if (stopped) return;
    setStatus(failures >= 2 ? 'polling' : status === 'connecting' ? 'connecting' : 'reconnecting');
    controller = new AbortController();
    try {
      const res = await doFetch(`${deps.baseUrl}/api/public/stream?type=listing`, {
        headers: { Authorization: `Bearer ${deps.apiKey}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) { fail(`stream HTTP ${res.status}`); return; }
      resetWatchdog();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) { fail('stream ended'); return; }
        resetWatchdog();
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf('\n\n')) >= 0) {
          const frame = buf.slice(0, idx); buf = buf.slice(idx + 2);
          handleFrame(frame);
        }
      }
    } catch (err) {
      if (stopped) return;
      fail(err instanceof Error ? err.message : String(err));
      return;
    }
    function handleFrame(frame: string) {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of frame.split('\n')) {
        if (line.startsWith(':')) return;            // heartbeat comment — watchdog already reset
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
      }
      if (event === 'listing' && dataLines.length) {
        const listing = normalizeStreamEvent(JSON.parse(dataLines.join('\n')));
        if (listing) emitIfNew(listing);
        if (status !== 'up') { failures = 0; stopPolling(); setStatus('up'); }
      } else if (status !== 'up') { failures = 0; stopPolling(); setStatus('up'); }
    }
  }

  return {
    start() { stopped = false; connect(); },
    stop() {
      stopped = true;
      controller?.abort(); controller = null;
      if (watchdog) clearTimeout(watchdog);
      stopPolling();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
    async backfill(limit = 100) {
      for (const l of await deps.api.getListings(limit)) deps.ring.add(l);
    },
    getStatus: () => ({ status, lastEventAt, lastError }),
  };
}
```

Note: implementer may restructure (e.g. hoist `handleFrame`), but the observable contract in the behavior spec must hold — that is what the tests assert.

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): SSE service with heartbeat watchdog and polling fallback"
```

---

### Task 6: Trends/Stats poller with storage mirror

**Files:**
- Create: `modules/listing/src/backend/poller.ts`
- Test: `modules/listing/src/backend/poller.test.ts`

**Interfaces:**
- Consumes: `ListingApi` (Task 2), `BackendModuleContext` shape (jobs/storage/log — inject as narrowed struct).
- Produces:

```ts
interface PollerCache { trends: TrendsData | null; stats: StatsData | null; exchanges: string[] | null; updatedAt: number | null; }
function startPoller(deps: {
  api: Pick<ListingApi, 'getTrends' | 'getStats' | 'getExchanges'>;
  jobs: { every(ms: number, fn: () => void | Promise<void>, name?: string): { dispose(): void } };
  storage: { get<T>(k: string): Promise<T | null>; set(k: string, v: unknown): Promise<void> };
  intervalMs?: number;  // default 300_000
}): { cache(): PollerCache; refresh(): Promise<void>; dispose(): void }
```

Behavior: `refresh()` fetches all three, writes memory cache + `ctx.storage` keys `trends`, `stats`, `exchanges`; on upstream error keeps previous cache (log via returned flag, no throw after first success — first refresh failure leaves nulls and throws). `start` runs one immediate `refresh()` (fire-and-forget), restores cache from storage at construction, then `jobs.every(intervalMs, refresh)`.

- [ ] **Step 1: Failing test** — fake jobs run fn immediately on `every`; fake storage = Map; fake api with vi.fn returning fixtures; assert cache populated + storage written; api rejection on second refresh keeps old cache; constructor restores from pre-seeded storage.

```ts
import { describe, expect, it, vi } from 'vitest';
import { startPoller } from './poller';
import type { StatsData, TrendsData } from '../shared/types';

const TRENDS = { trending_tickers: { last_7_days: [], last_30_days: [] }, trending_exchanges: { last_7_days: [], last_30_days: [] }, metadata: { last_updated: 'x' } } as unknown as TrendsData;
const STATS = { global_stats: { total_listings: 5, total_exchanges: 2, total_tickers: 3, total_pairs: 4, last_updated: 'x' }, activity_stats: {} as never, pair_stats: { most_common_quote_currencies: [] } } as unknown as StatsData;

function makeDeps() {
  const storageMap = new Map<string, unknown>();
  const api = { getTrends: vi.fn(async () => TRENDS), getStats: vi.fn(async () => STATS), getExchanges: vi.fn(async () => ['binance']) };
  const jobs = { every: (_ms: number, fn: () => void) => { fn(); return { dispose: () => undefined }; } };
  const storage = {
    get: async <T,>(k: string) => (storageMap.get(k) as T) ?? null,
    set: async (k: string, v: unknown) => { storageMap.set(k, v); },
  };
  return { api, jobs, storage, storageMap };
}

it('populates cache and mirrors to storage', async () => {
  const d = makeDeps();
  const p = startPoller(d);
  await vi.waitFor(() => expect(p.cache().trends).toEqual(TRENDS));
  expect(p.cache().stats).toEqual(STATS);
  expect(p.cache().exchanges).toEqual(['binance']);
  expect(d.storageMap.get('trends')).toEqual(TRENDS);
});

it('keeps last good cache when refresh fails', async () => {
  const d = makeDeps();
  const p = startPoller(d);
  await vi.waitFor(() => expect(p.cache().trends).not.toBeNull());
  d.api.getTrends.mockRejectedValue(new Error('boom'));
  await p.refresh();  // must not throw
  expect(p.cache().trends).toEqual(TRENDS);
});

it('restores cache from storage', async () => {
  const d = makeDeps();
  d.storageMap.set('trends', TRENDS);
  const p = startPoller({ ...d, jobs: { every: () => ({ dispose: () => undefined }) } });
  expect(p.cache().trends).toEqual(TRENDS);
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementation**

```ts
import type { StatsData, TrendsData } from '../shared/types';

export interface PollerCache { trends: TrendsData | null; stats: StatsData | null; exchanges: string[] | null; updatedAt: number | null; }

export function startPoller(deps: {
  api: { getTrends(): Promise<TrendsData>; getStats(): Promise<StatsData>; getExchanges(): Promise<string[]> };
  jobs: { every(ms: number, fn: () => void | Promise<void>, name?: string): { dispose(): void } };
  storage: { get<T>(k: string): Promise<T | null>; set(k: string, v: unknown): Promise<void> };
  intervalMs?: number;
}): { cache(): PollerCache; refresh(): Promise<void>; dispose(): void } {
  let cache: PollerCache = { trends: null, stats: null, exchanges: null, updatedAt: null };
  let disposed = false;

  void (async () => {   // restore
    const [trends, stats, exchanges] = await Promise.all([
      deps.storage.get<TrendsData>('trends'), deps.storage.get<StatsData>('stats'), deps.storage.get<string[]>('exchanges'),
    ]);
    cache = { trends, stats, exchanges, updatedAt: cache.updatedAt };
  })();

  async function refresh(): Promise<void> {
    try {
      const [trends, stats, exchanges] = await Promise.all([deps.api.getTrends(), deps.api.getStats(), deps.api.getExchanges()]);
      cache = { trends, stats, exchanges, updatedAt: Date.now() };
      await Promise.all([deps.storage.set('trends', trends), deps.storage.set('stats', stats), deps.storage.set('exchanges', exchanges)]);
    } catch (err) {
      if (cache.trends === null) throw err;   // first refresh must surface failure
    }
  }

  const job = deps.jobs.every(deps.intervalMs ?? 300_000, () => void refresh(), 'trends-stats');
  void refresh();
  return { cache: () => cache, refresh, dispose: () => { disposed = job.dispose(); void disposed; } };
}
```

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): trends/stats poller with storage mirror"
```

---

### Task 7: Backend wiring + routes

**Files:**
- Modify: `modules/listing/src/backend/index.ts`
- Test: `modules/listing/src/backend/index.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–6, `BackendModuleContext` from the SDK.
- Produces (used by frontend Tasks 9–11):
  - `GET /api/modules/listing/listings/recent?limit=50` → `{ listings: ModuleListing[] }`
  - `GET /api/modules/listing/trends` → `{ trends: TrendsData | null, updatedAt: number | null }`
  - `GET /api/modules/listing/stats` → `{ stats: StatsData | null, updatedAt: number | null }`
  - `GET /api/modules/listing/exchanges` → `{ exchanges: string[] }`
  - `GET /api/modules/listing/status` → `{ status: SseStatus, lastEventAt, lastError, keyConfigured: boolean }`
  - Socket `/m/listing` events: `listing` (payload `ModuleListing`), `status` (payload `SseStatus`).
  - Missing key: all data routes `503 { error: 'LISTINGAPIS_API_KEY is not configured' }`; `402` upstream → route `402 { error: 'MM balance exhausted' }`; other upstream errors → `502 { error: 'ListingAPIs unavailable' }`.
  - Module exports for tests: `buildModule(deps)` — a factory taking `{ fetchImpl?, env?: Record<string,string|undefined> }` returning `{ backend: BackendModule; __reset(): void }` so tests can inject fakes; default export uses real env/fetch.

- [ ] **Step 1: Failing test** — construct `buildModule({ fetchImpl: fake, env: { LISTINGAPIS_API_KEY: 'k' } })`, call `backend.start(fakeCtx)`, then dispatch requests through the returned routes: `const app = new Elysia().use(routes as never); const res = await app.handle(new Request('http://localhost/trends'))`. Cover: no key → 503 on every data route but `/status` 200 with `keyConfigured: false`; happy path `/listings/recent` returns ring contents newest-first; `/trends` returns cached payload; SSE wiring — `fakeCtx.io.emit` called with `('listing', ...)` when the fake fetch stream delivers a listing frame (reuse `sseFrame`/`makeStream` helpers from Task 5 test, extracted to `src/backend/testStreams.ts` and imported by both tests).

`fakeCtx` shape (typed inline in the test file):

```ts
function makeCtx() {
  const emitted: [string, unknown[]][] = [];
  const storageMap = new Map<string, unknown>();
  return {
    ctx: {
      id: 'listing', version: '0.1.0', routesPrefix: '/api/modules/listing',
      log: { info: () => undefined, warn: () => undefined, error: () => undefined },
      io: { emit: (...args: unknown[]) => { emitted.push([args[0] as string, args.slice(1)]); return true; }, on: () => undefined },
      jobs: { every: () => ({ dispose: () => undefined }), once: () => ({ dispose: () => undefined }) },
      storage: {
        get: async <T,>(k: string) => (storageMap.get(k) as T) ?? null,
        set: async (k: string, v: unknown) => { storageMap.set(k, v); },
        delete: async (k: string) => { storageMap.delete(k); }, all: async () => Object.fromEntries(storageMap),
      },
      ccxt: { getInstance: async () => { throw new Error('not used'); } },
      providers: { register: () => ({ dispose: () => undefined }), unregister: () => false },
      env: { dataDir: '/tmp' },
    } as never,
    emitted, storageMap,
  };
}
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementation** — `src/backend/index.ts`:

```ts
import { Elysia } from 'elysia';
import type { BackendModule, BackendModuleContext } from '@profitmaker/module-sdk';
import type { ModuleListing, SseStatus } from '../shared/types';
import { AuthError, BillingError, MissingKeyError, UpstreamError, createListingApi } from './apiClient';
import { createListingRing, type ListingRing } from './ringBuffer';
import { createSseService, type SseService } from './sse';
import { startPoller, type PollerCache } from './poller';

interface ModuleHandles { routes: Elysia; }
interface BuildDeps { fetchImpl?: typeof fetch; env?: Record<string, string | undefined>; }

export function buildModule(deps: BuildDeps = {}): { backend: BackendModule; __reset(): void } {
  let sse: SseService | null = null;
  let poller: { cache(): PollerCache; dispose(): void } | null = null;
  let ring: ListingRing = createListingRing();
  let keyConfigured = false;

  const backend: BackendModule = {
    async start(ctx: BackendModuleContext) {
      const env = deps.env ?? process.env;
      const apiKey = env.LISTINGAPIS_API_KEY ?? null;
      const baseUrl = env.LISTINGAPIS_API_URL ?? 'https://api.listingapis.com';
      keyConfigured = apiKey !== null;

      if (!apiKey) {
        ctx.log.warn('LISTINGAPIS_API_KEY not set — module runs in inactive mode (routes return 503)');
      } else {
        const api = createListingApi({ baseUrl, apiKey, fetchImpl: deps.fetchImpl });
        ring = createListingRing(100);
        sse = createSseService({
          baseUrl, apiKey, api, ring,
          fetchImpl: deps.fetchImpl,
          onListing: (l) => ctx.io.emit('listing', l),
          onStatus: (s) => ctx.io.emit('status', s),
        });
        poller = startPoller({ api, jobs: ctx.jobs, storage: ctx.storage });
        await sse.backfill(100).catch((e) => ctx.log.warn(`backfill failed: ${e}`));
        sse.start();
      }

      const routes = new Elysia()
        .get('/listings/recent', ({ query, set }) => {
          if (!keyConfigured) return err(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 100);
          return { listings: ring.recent(limit) };
        })
        .get('/trends', ({ set }) => {
          if (!keyConfigured) return err(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const c = poller?.cache();
          return { trends: c?.trends ?? null, updatedAt: c?.updatedAt ?? null };
        })
        .get('/stats', ({ set }) => {
          if (!keyConfigured) return err(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          const c = poller?.cache();
          return { stats: c?.stats ?? null, updatedAt: c?.updatedAt ?? null };
        })
        .get('/exchanges', ({ set }) => {
          if (!keyConfigured) return err(set, 503, 'LISTINGAPIS_API_KEY is not configured');
          return { exchanges: poller?.cache().exchanges ?? [] };
        })
        .get('/status', () => {
          const s = sse?.getStatus();
          return { status: s?.status ?? ('inactive' as SseStatus), lastEventAt: s?.lastEventAt ?? null, lastError: s?.lastError ?? null, keyConfigured };
        });

      return { routes: routes as unknown as ModuleHandles['routes'] };
    },
    async stop() { sse?.stop(); poller?.dispose(); },
  };
  return { backend, __reset() { sse = null; poller = null; ring = createListingRing(); } };
}

function err(set: { status: number }, status: number, message: string) {
  set.status = status;
  return { error: message };
}

export default buildModule();
```

Wait — `sse.ts` typing has `status: SseStatus` never `'inactive'`; widen `/status` response type locally to `SseStatus | 'inactive'` (define `type RouteStatus = SseStatus | 'inactive'` in shared/types.ts and use it). Adjust during implementation to keep typecheck green; tests assert `keyConfigured` and passthrough values.

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): backend module routes and service wiring"
```

---

### Task 8: Frontend helpers (filters, time, beep, store access)

**Files:**
- Create: `modules/listing/src/frontend/lib.ts`
- Test: `modules/listing/src/frontend/lib.test.ts`

**Interfaces:**
- Consumes: `ModuleListing`, `LiveConfig` (Task 2).
- Produces:

```ts
function passFilters(listing: ModuleListing, config: LiveConfig): boolean;
function formatTime(iso: string | null): string;          // 'HH:MM:SS' local, '' for null
function playBeep(): void;                                  // Web Audio, lazy AudioContext, silent-fail
function defaultLiveConfig(): Required<LiveConfig>;         // { exchanges: [], types: [], sound: true, toast: true, autoRestore: true }
/** Structural view of the host dashboard store (loose typing like the template). */
interface DashboardStoreShape {
  dashboards: Array<{ id: string; widgets: Array<{ id: string; isMinimized?: boolean }> }>;
  toggleWidgetMinimized: (dashboardId: string, widgetId: string) => void;
}
function restoreIfMinimized(store: DashboardStoreShape, widgetId: string): void;
```

- [ ] **Step 1: Failing test**

```ts
import { describe, expect, it } from 'vitest';
import { defaultLiveConfig, formatTime, passFilters, restoreIfMinimized } from './lib';
import type { ModuleListing } from '../shared/types';

const L = (over: Partial<ModuleListing> = {}): ModuleListing => ({
  id: 1, exchange: 'binance', symbol: 'DOGE', fullName: 'Dogecoin', type: 'listing',
  title: 't', url: null, listedAt: null, detectedAt: null, source: null, ...over,
});

describe('passFilters', () => {
  it('passes everything with default config', () => {
    expect(passFilters(L(), defaultLiveConfig())).toBe(true);
  });
  it('filters by exchange', () => {
    expect(passFilters(L({ exchange: 'okx' }), { ...defaultLiveConfig(), exchanges: ['binance'] })).toBe(false);
    expect(passFilters(L({ exchange: 'okx' }), { ...defaultLiveConfig(), exchanges: ['okx', 'bybit'] })).toBe(true);
  });
  it('filters by type', () => {
    expect(passFilters(L({ type: 'new-pair' }), { ...defaultLiveConfig(), types: ['listing'] })).toBe(false);
  });
});

describe('formatTime', () => {
  it('formats HH:MM:SS local', () => {
    expect(formatTime('2026-08-23T10:30:05Z')).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
  it('empty for null', () => { expect(formatTime(null)).toBe(''); });
});

describe('restoreIfMinimized', () => {
  it('un-minimizes only when minimized', () => {
    const calls: [string, string][] = [];
    const store = {
      dashboards: [{ id: 'd1', widgets: [{ id: 'w1', isMinimized: true }, { id: 'w2', isMinimized: false }] }],
      toggleWidgetMinimized: (d: string, w: string) => { calls.push([d, w]); },
    };
    restoreIfMinimized(store, 'w1');
    restoreIfMinimized(store, 'w2');
    expect(calls).toEqual([['d1', 'w1']]);
  });
  it('no-op for unknown widget', () => {
    const store = { dashboards: [], toggleWidgetMinimized: vi.fn() };
    expect(() => restoreIfMinimized(store, 'zzz')).not.toThrow();
  });
});
```

- [ ] **Step 2: Run, verify FAIL.**

- [ ] **Step 3: Implementation**

```ts
import type { LiveConfig, ModuleListing } from '../shared/types';

export interface DashboardStoreShape {
  dashboards: Array<{ id: string; widgets: Array<{ id: string; isMinimized?: boolean }> }>;
  toggleWidgetMinimized: (dashboardId: string, widgetId: string) => void;
}

export function defaultLiveConfig(): Required<LiveConfig> {
  return { exchanges: [], types: [], sound: true, toast: true, autoRestore: true };
}

export function passFilters(listing: ModuleListing, config: LiveConfig): boolean {
  if (config.exchanges?.length && !config.exchanges.includes(listing.exchange)) return false;
  if (config.types?.length && !config.types.includes(listing.type)) return false;
  return true;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour12: false });
}

let audioCtx: AudioContext | null = null;
/** Short two-tone alert. Lazily creates AudioContext; may be blocked by autoplay policy — that is fine. */
export function playBeep(): void {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const t0 = audioCtx.currentTime;
    for (const [freq, at] of [[880, 0], [1320, 0.12]] as const) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, t0 + at);
      gain.gain.exponentialRampToValueAtTime(0.2, t0 + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + at + 0.15);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t0 + at); osc.stop(t0 + at + 0.16);
    }
  } catch { /* audio unavailable — alerts degrade to toast only */ }
}

export function restoreIfMinimized(store: DashboardStoreShape, widgetId: string): void {
  const dash = store.dashboards.find((d) => d.widgets.some((w) => w.id === widgetId));
  const widget = dash?.widgets.find((w) => w.id === widgetId);
  if (dash && widget?.isMinimized) store.toggleWidgetMinimized(dash.id, widgetId);
}
```

- [ ] **Step 4: Run tests (PASS), typecheck, commit**

```bash
bun run test && bun run typecheck
git add modules/listing/src
git commit -m "feat(listing): frontend filter/alert helpers"
```

---

### Task 9: Live Listings widget + settings

**Files:**
- Create: `modules/listing/src/frontend/LiveListings.tsx`, `modules/listing/src/frontend/LiveListingsSettings.tsx`
- Modify: `modules/listing/src/frontend/index.tsx` (register widget), `modules/listing/src/frontend/style.css`

**Interfaces:**
- Consumes: SDK `useModuleSocket('listing')`, `getTerminal().api.fetch`, `terminal.notify`, `terminal.stores.useDashboardStore`; helpers from Task 8; `ModuleListing`, `LiveConfig`, `SseStatus` from Task 2; `/listings/recent`, `/exchanges`, `/status` routes from Task 7.
- Produces: widget `listing.live` registered via `defineModule`; config keys exactly `LiveConfig`.

- [ ] **Step 1: `LiveListings.tsx`** — full component:

```tsx
import React from 'react';
import { getTerminal, useModuleSocket } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { ModuleListing, SseStatus } from '../shared/types';
import { defaultLiveConfig, formatTime, passFilters, playBeep, restoreIfMinimized, type DashboardStoreShape } from './lib';

const MAX_ROWS = 100;
const STATUS_LABEL: Record<string, string> = {
  connecting: 'connecting…', up: 'live', reconnecting: 'reconnecting…', polling: 'polling', inactive: 'no key',
};

export function LiveListingsWidget({ widgetId, config }: WidgetProps) {
  const terminal = getTerminal();
  const socket = useModuleSocket('listing');
  const [listings, setListings] = React.useState<ModuleListing[]>([]);
  const [status, setStatus] = React.useState<string>('connecting');
  const [banner, setBanner] = React.useState<string | null>(null);
  const cfg = { ...defaultLiveConfig(), ...(config as Partial<ReturnType<typeof defaultLiveConfig>>) };

  // Backfill + current status on mount.
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/listings/recent?limit=50');
        if (!alive) return;
        if (res.status === 402) { setBanner('MM balance exhausted — top up at auth.marketmaker.cc'); return; }
        if (res.status === 503) { setBanner('LISTINGAPIS_API_KEY is not configured on the server'); return; }
        if (!res.ok) { setBanner('ListingAPIs unavailable'); return; }
        setBanner(null);
        const data = (await res.json()) as { listings: ModuleListing[] };
        setListings(data.listings.slice(0, MAX_ROWS));
      } catch { if (alive) setBanner('connection error'); }
      try {
        const st = await terminal.api.fetch('/api/modules/listing/status');
        if (alive && st.ok) setStatus(((await st.json()) as { status: string }).status);
      } catch { /* status is best-effort */ }
    })();
    return () => { alive = false; };
  }, [terminal]);

  // Live pushes.
  React.useEffect(() => {
    if (!socket) return;
    const onListing = (raw: unknown) => {
      const listing = raw as ModuleListing;
      if (!passFilters(listing, cfg)) return;
      setListings((prev) => [listing, ...prev].slice(0, MAX_ROWS));
      setBanner(null);
      if (cfg.toast) terminal.notify.info(`Listing: ${listing.symbol} on ${listing.exchange}`);
      if (cfg.sound) playBeep();
      if (cfg.autoRestore) {
        const store = terminal.stores.useDashboardStore as unknown as DashboardStoreShape & { getState(): DashboardStoreShape };
        restoreIfMinimized(store.getState(), widgetId);
      }
    };
    const onStatus = (raw: unknown) => setStatus(raw as SseStatus);
    socket.on('listing', onListing);
    socket.on('status', onStatus);
    return () => { socket.off('listing', onListing); socket.off('status', onStatus); };
  }, [socket, widgetId, terminal, cfg.exchanges, cfg.types, cfg.sound, cfg.toast, cfg.autoRestore]);

  const visible = listings; // already filtered on push; backfill rows also pass through filter render-time:
  const rows = visible.filter((l) => passFilters(l, cfg));

  return (
    <div className="pm-lw-live">
      <div className="pm-lw-live__bar">
        <span className={`pm-lw-badge pm-lw-badge--${status === 'up' ? 'up' : 'warn'}`}>{STATUS_LABEL[status] ?? status}</span>
      </div>
      {banner && <div className="pm-lw-banner">{banner}</div>}
      {rows.length === 0 && !banner && (
        <div className="pm-lw-empty">waiting for new listings…</div>
      )}
      <div className="pm-lw-live__rows">
        {rows.map((l) => (
          <div key={l.id} className={`pm-lw-row pm-lw-row--${l.type}`}>
            <span className="pm-lw-row__time">{formatTime(l.detectedAt ?? l.listedAt)}</span>
            <span className="pm-lw-row__ex">{l.exchange}</span>
            <span className="pm-lw-row__sym" title={l.fullName}>{l.symbol}</span>
            <span className="pm-lw-row__type">{l.type === 'new-pair' ? 'pair' : 'listing'}</span>
            {l.url && (
              <a className="pm-lw-row__link" href={l.url} target="_blank" rel="noreferrer">↗</a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `LiveListingsSettings.tsx`**

```tsx
import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetSettingsProps } from '@profitmaker/module-sdk';
import { defaultLiveConfig, type DashboardStoreShape } from './lib';

export function LiveListingsSettings({ widgetId }: WidgetSettingsProps) {
  const terminal = getTerminal();
  const useDashboardStore = terminal.stores.useDashboardStore as unknown as {
    (s: (st: DashboardStoreShape & { dashboards: Array<{ widgets: Array<{ id: string; config?: Record<string, unknown> }> }> }) => unknown): unknown;
    getState(): DashboardStoreShape & { updateWidgetConfig: (id: string, patch: Record<string, unknown>) => void };
  };
  const cfg = useDashboardStore((s) => {
    for (const d of s.dashboards) {
      const w = d.widgets.find((x) => x.id === widgetId);
      if (w) return { ...defaultLiveConfig(), ...(w.config ?? {}) };
    }
    return defaultLiveConfig();
  }) as ReturnType<typeof defaultLiveConfig>;
  const [exchanges, setExchanges] = React.useState<string[]>([]);

  React.useEffect(() => {
    void (async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/exchanges');
        if (res.ok) setExchanges(((await res.json()) as { exchanges: string[] }).exchanges);
      } catch { /* optional list */ }
    })();
  }, [terminal]);

  const set = (patch: Record<string, unknown>) => useDashboardStore.getState().updateWidgetConfig(widgetId, patch);
  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="pm-lw-settings">
      <div className="pm-lw-settings__section">Alerts</div>
      {(['sound', 'toast', 'autoRestore'] as const).map((key) => (
        <label key={key} className="pm-lw-settings__row">
          <input type="checkbox" checked={cfg[key]} onChange={(e) => set({ [key]: e.target.checked })} />
          {{ sound: 'Sound', toast: 'Toast notification', autoRestore: 'Auto-restore widget' }[key]}
        </label>
      ))}
      <div className="pm-lw-settings__section">Types</div>
      {(['listing', 'new-pair'] as const).map((t) => (
        <label key={t} className="pm-lw-settings__row">
          <input
            type="checkbox"
            checked={cfg.types.includes(t)}
            onChange={(e) => set({ types: e.target.checked ? [...cfg.types, t] : cfg.types.filter((x) => x !== t) })}
          />
          {t === 'listing' ? 'Listings' : 'New pairs'}
        </label>
      ))}
      <div className="pm-lw-settings__section">Exchanges (empty = all)</div>
      {exchanges.length === 0 && <div className="pm-lw-settings__hint">exchange list unavailable (module not configured?)</div>}
      {exchanges.map((ex) => (
        <label key={ex} className="pm-lw-settings__row">
          <input
            type="checkbox"
            checked={cfg.exchanges.includes(ex)}
            onChange={() => set({ exchanges: toggleIn(cfg.exchanges, ex) })}
          />
          {ex}
        </label>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Register in `src/frontend/index.tsx`** — replace the placeholder:

```tsx
import { defineModule } from '@profitmaker/module-sdk';
import type { WidgetDefinition } from '@profitmaker/module-sdk';
import { LiveListingsWidget, } from './LiveListings';
import { LiveListingsSettings } from './LiveListingsSettings';
import './style.css';

const liveListings: WidgetDefinition = {
  type: 'listing.live',
  title: 'Live Listings',
  icon: 'Zap',
  category: 'modules',
  defaultSize: { width: 420, height: 420 },
  showGroupSelector: false,
  needsTransparentGroup: true,
  Component: LiveListingsWidget,
  Settings: LiveListingsSettings,
};

export default defineModule({ id: 'listing', widgets: [liveListings] });
```

- [ ] **Step 4: Styles** — append to `src/frontend/style.css`:

```css
.pm-lw-live { display: flex; flex-direction: column; height: 100%; padding: 8px;
  color: var(--terminal-text); background: var(--terminal-widget); font-size: 12px; }
.pm-lw-live__bar { display: flex; gap: 8px; margin-bottom: 6px; }
.pm-lw-badge { padding: 1px 8px; border-radius: 999px; font-size: 11px; border: 1px solid var(--terminal-border); }
.pm-lw-badge--up { color: var(--terminal-positive); border-color: var(--terminal-positive); }
.pm-lw-badge--warn { color: var(--terminal-muted); }
.pm-lw-banner { padding: 6px 8px; margin-bottom: 6px; border-radius: 6px; font-size: 12px;
  color: var(--terminal-text); background: color-mix(in srgb, var(--terminal-accent) 25%, transparent);
  border: 1px solid var(--terminal-accent); }
.pm-lw-empty { margin: auto; color: var(--terminal-muted); }
.pm-lw-live__rows { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pm-lw-row { display: grid; grid-template-columns: 64px 1fr 88px 52px 20px; gap: 6px;
  align-items: center; padding: 3px 6px; border-radius: 4px; }
.pm-lw-row:hover { background: color-mix(in srgb, var(--terminal-accent) 12%, transparent); }
.pm-lw-row__time { color: var(--terminal-muted); font-variant-numeric: tabular-nums; }
.pm-lw-row__ex { color: var(--terminal-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-lw-row__sym { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-lw-row__type { font-size: 10px; color: var(--terminal-muted);
  border: 1px solid var(--terminal-border); border-radius: 999px; text-align: center; }
.pm-lw-row--new-pair .pm-lw-row__type { color: var(--terminal-accent); border-color: var(--terminal-accent); }
.pm-lw-row__link { color: var(--terminal-muted); text-decoration: none; }
.pm-lw-settings { padding: 12px; color: var(--terminal-text); font-size: 13px; display: flex; flex-direction: column; gap: 6px; }
.pm-lw-settings__section { font-weight: 600; margin-top: 8px; color: var(--terminal-muted); }
.pm-lw-settings__row { display: flex; align-items: center; gap: 8px; }
.pm-lw-settings__hint { color: var(--terminal-muted); font-size: 12px; }
```

- [ ] **Step 5: Verify build + typecheck, manual smoke, commit**

```bash
cd modules/listing && bun run typecheck && bun run build && bun run test
```

Manual smoke (documented, not blocking): run terminal server with `PROFITMAKER_DEV_MODULES=$(pwd)/modules/listing` (needs a build first) and `LISTINGAPIS_API_KEY` set; add the Live Listings widget; verify badge + backfill.

```bash
git add modules/listing/src
git commit -m "feat(listing): live listings widget with alerts and filters"
```

---

### Task 10: Trends widget

**Files:**
- Create: `modules/listing/src/frontend/Trends.tsx`
- Modify: `modules/listing/src/frontend/index.tsx` (add widget), `modules/listing/src/frontend/style.css`

**Interfaces:**
- Consumes: `/trends` route (Task 7): `{ trends: TrendsData | null; updatedAt: number | null }`; `TrendingTicker`, `TrendingExchange`, `TrendsData` (Task 2).
- Produces: widget `listing.trends`.

- [ ] **Step 1: `Trends.tsx`**

```tsx
import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { TrendsData, TrendingExchange, TrendingTicker } from '../shared/types';

type Window = '7d' | '30d';
type Kind = 'tickers' | 'exchanges';
const REFRESH_MS = 300_000;

function ChangeCell({ value, trend }: { value: number; trend: 'up' | 'down' | 'stable' }) {
  const cls = trend === 'up' ? 'pm-lw-chg--up' : trend === 'down' ? 'pm-lw-chg--down' : 'pm-lw-chg--stable';
  return <span className={`pm-lw-chg ${cls}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

export function TrendsWidget(_props: WidgetProps) {
  const terminal = getTerminal();
  const [data, setData] = React.useState<TrendsData | null>(null);
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null);
  const [win, setWin] = React.useState<Window>('7d');
  const [kind, setKind] = React.useState<Kind>('tickers');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/trends');
        if (!alive) return;
        if (!res.ok) { setError(res.status === 503 ? 'module not configured' : 'ListingAPIs unavailable'); return; }
        const body = (await res.json()) as { trends: TrendsData | null; updatedAt: number | null };
        setError(null); setData(body.trends); setUpdatedAt(body.updatedAt);
      } catch { if (alive) setError('connection error'); }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [terminal]);

  const tickers: TrendingTicker[] = data?.trending_tickers[win === '7d' ? 'last_7_days' : 'last_30_days'] ?? [];
  const exchanges: TrendingExchange[] = data?.trending_exchanges[win === '7d' ? 'last_7_days' : 'last_30_days'] ?? [];

  return (
    <div className="pm-lw-trends">
      <div className="pm-lw-tabs">
        {(['7d', '30d'] as Window[]).map((w) => (
          <button key={w} className={`pm-lw-tab ${win === w ? 'pm-lw-tab--active' : ''}`} onClick={() => setWin(w)}>{w}</button>
        ))}
        <span className="pm-lw-tabs__spacer" />
        {(['tickers', 'exchanges'] as Kind[]).map((k) => (
          <button key={k} className={`pm-lw-tab ${kind === k ? 'pm-lw-tab--active' : ''}`} onClick={() => setKind(k)}>{k}</button>
        ))}
      </div>
      {error && <div className="pm-lw-banner">{error}</div>}
      <div className="pm-lw-trends__rows">
        {kind === 'tickers'
          ? tickers.map((t) => (
            <div key={t.ticker_symbol} className="pm-lw-trow">
              <span className="pm-lw-trow__rank">{t.rank}</span>
              <span className="pm-lw-trow__sym" title={t.ticker_full_name}>{t.ticker_symbol}</span>
              <span className="pm-lw-trow__num">{t.listings_count} listings</span>
              <span className="pm-lw-trow__num">{t.exchanges_count} ex</span>
              <ChangeCell value={t.change_percentage} trend={t.trend} />
            </div>
          ))
          : exchanges.map((e) => (
            <div key={e.exchange_slug} className="pm-lw-trow">
              <span className="pm-lw-trow__rank">{e.rank}</span>
              <span className="pm-lw-trow__sym">{e.exchange_name}</span>
              <span className="pm-lw-trow__num">{e.listings_count} listings</span>
              <span className="pm-lw-trow__num">{e.unique_tickers} coins</span>
              <ChangeCell value={e.change_percentage} trend={e.trend} />
            </div>
          ))}
        {!error && ((kind === 'tickers' && tickers.length === 0) || (kind === 'exchanges' && exchanges.length === 0)) && (
          <div className="pm-lw-empty">no trends data yet…</div>
        )}
      </div>
      {data?.metadata?.last_updated && (
        <div className="pm-lw-footer">updated {new Date(data.metadata.last_updated).toLocaleString()}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register** — in `index.tsx` add:

```tsx
import { TrendsWidget } from './Trends';

const trends: WidgetDefinition = {
  type: 'listing.trends',
  title: 'Listing Trends',
  icon: 'TrendingUp',
  category: 'modules',
  defaultSize: { width: 380, height: 420 },
  showGroupSelector: false,
  needsTransparentGroup: true,
  Component: TrendsWidget,
};
// widgets: [liveListings, trends]
```

- [ ] **Step 3: Styles** — append to `style.css`:

```css
.pm-lw-trends { display: flex; flex-direction: column; height: 100%; padding: 8px;
  color: var(--terminal-text); background: var(--terminal-widget); font-size: 12px; }
.pm-lw-tabs { display: flex; gap: 4px; margin-bottom: 6px; align-items: center; }
.pm-lw-tabs__spacer { flex: 1; }
.pm-lw-tab { padding: 2px 10px; border-radius: 999px; border: 1px solid var(--terminal-border);
  background: transparent; color: var(--terminal-muted); cursor: pointer; font-size: 11px; }
.pm-lw-tab--active { color: var(--terminal-text); border-color: var(--terminal-accent); }
.pm-lw-trends__rows { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.pm-lw-trow { display: grid; grid-template-columns: 28px 1fr 84px 56px 64px; gap: 6px; align-items: center;
  padding: 3px 6px; border-radius: 4px; }
.pm-lw-trow:hover { background: color-mix(in srgb, var(--terminal-accent) 12%, transparent); }
.pm-lw-trow__rank { color: var(--terminal-muted); font-variant-numeric: tabular-nums; }
.pm-lw-trow__sym { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-lw-trow__num { color: var(--terminal-muted); font-variant-numeric: tabular-nums; }
.pm-lw-chg--up { color: var(--terminal-positive); } .pm-lw-chg--down { color: var(--terminal-negative); }
.pm-lw-chg--stable { color: var(--terminal-muted); }
.pm-lw-footer { padding-top: 4px; color: var(--terminal-muted); font-size: 10px; text-align: right; }
```

- [ ] **Step 4: typecheck + build + test, commit**

```bash
bun run typecheck && bun run build && bun run test
git add modules/listing/src
git commit -m "feat(listing): trends widget (7d/30d tickers & exchanges)"
```

---

### Task 11: Stats widget

**Files:**
- Create: `modules/listing/src/frontend/Stats.tsx`
- Modify: `modules/listing/src/frontend/index.tsx`, `modules/listing/src/frontend/style.css`

**Interfaces:**
- Consumes: `/stats` route (Task 7): `{ stats: StatsData | null; updatedAt: number | null }`; `StatsData` (Task 2).
- Produces: widget `listing.stats`.

- [ ] **Step 1: `Stats.tsx`**

```tsx
import React from 'react';
import { getTerminal } from '@profitmaker/module-sdk';
import type { WidgetProps } from '@profitmaker/module-sdk';
import type { StatsData } from '../shared/types';

const REFRESH_MS = 300_000;

export function StatsWidget(_props: WidgetProps) {
  const terminal = getTerminal();
  const [stats, setStats] = React.useState<StatsData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await terminal.api.fetch('/api/modules/listing/stats');
        if (!alive) return;
        if (!res.ok) { setError(res.status === 503 ? 'module not configured' : 'ListingAPIs unavailable'); return; }
        setError(null);
        setStats(((await res.json()) as { stats: StatsData | null }).stats);
      } catch { if (alive) setError('connection error'); }
    };
    void load();
    const t = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(t); };
  }, [terminal]);

  const g = stats?.global_stats;
  const a = stats?.activity_stats;
  const quotes = stats?.pair_stats?.most_common_quote_currencies?.slice(0, 6) ?? [];

  return (
    <div className="pm-lw-stats">
      {error && <div className="pm-lw-banner">{error}</div>}
      <div className="pm-lw-stats__tiles">
        {[
          ['listings', g?.total_listings], ['exchanges', g?.total_exchanges],
          ['tickers', g?.total_tickers], ['pairs', g?.total_pairs],
        ].map(([label, value]) => (
          <div key={String(label)} className="pm-lw-tile">
            <div className="pm-lw-tile__value">{value ?? '—'}</div>
            <div className="pm-lw-tile__label">{label}</div>
          </div>
        ))}
      </div>
      <div className="pm-lw-stats__section">New listings</div>
      <div className="pm-lw-stats__activity">
        {a && ([['24h', a.last_24_hours], ['7d', a.last_7_days], ['30d', a.last_30_days]] as const).map(([label, p]) => (
          <div key={label} className="pm-lw-act">
            <div className="pm-lw-act__label">{label}</div>
            <div className="pm-lw-act__value">{p.new_listings + p.new_pairs}</div>
            <div className="pm-lw-act__sub">{p.top_exchange}</div>
          </div>
        ))}
      </div>
      {quotes.length > 0 && (
        <>
          <div className="pm-lw-stats__section">Top quote currencies</div>
          <div className="pm-lw-stats__quotes">
            {quotes.map((q) => (
              <span key={q.quote} className="pm-lw-quote">{q.quote} · {q.count}</span>
            ))}
          </div>
        </>
      )}
      {stats?.global_stats?.last_updated && (
        <div className="pm-lw-footer">updated {new Date(stats.global_stats.last_updated).toLocaleString()}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Register** — add to `index.tsx`:

```tsx
import { StatsWidget } from './Stats';

const statsWidget: WidgetDefinition = {
  type: 'listing.stats',
  title: 'Listing Stats',
  icon: 'BarChart3',
  category: 'modules',
  defaultSize: { width: 360, height: 300 },
  showGroupSelector: false,
  needsTransparentGroup: true,
  Component: StatsWidget,
};
// widgets: [liveListings, trends, statsWidget]
```

- [ ] **Step 3: Styles** — append to `style.css`:

```css
.pm-lw-stats { display: flex; flex-direction: column; height: 100%; padding: 10px; gap: 6px;
  color: var(--terminal-text); background: var(--terminal-widget); font-size: 12px; overflow-y: auto; }
.pm-lw-stats__tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.pm-lw-tile { border: 1px solid var(--terminal-border); border-radius: 6px; padding: 8px 4px; text-align: center; }
.pm-lw-tile__value { font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.pm-lw-tile__label { font-size: 10px; color: var(--terminal-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.pm-lw-stats__section { font-weight: 600; margin-top: 4px; color: var(--terminal-muted); }
.pm-lw-stats__activity { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.pm-lw-act { border: 1px solid var(--terminal-border); border-radius: 6px; padding: 6px; text-align: center; }
.pm-lw-act__label { font-size: 10px; color: var(--terminal-muted); }
.pm-lw-act__value { font-size: 16px; font-weight: 600; }
.pm-lw-act__sub { font-size: 10px; color: var(--terminal-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pm-lw-stats__quotes { display: flex; flex-wrap: wrap; gap: 4px; }
.pm-lw-quote { border: 1px solid var(--terminal-border); border-radius: 999px; padding: 1px 8px; font-size: 11px; color: var(--terminal-muted); }
```

- [ ] **Step 4: typecheck + build + test, commit**

```bash
bun run typecheck && bun run build && bun run test
git add modules/listing/src
git commit -m "feat(listing): stats widget"
```

---

### Task 12: Zap icon, README, publish prep, final verification

**Files:**
- Modify: `packages/client/src/modules/resolveIcon.tsx` (add `Zap`), `modules/listing/README.md` (create), `modules/listing/package.json` (version 0.1.0 already)
- Test: existing suites must stay green.

**Interfaces:**
- Consumes: everything above.
- Produces: publishable npm package + docs.

- [ ] **Step 1: Add Zap to the host icon map** — `packages/client/src/modules/resolveIcon.tsx`: add `Zap,` to the lucide-react import list and `Zap,` to the `ICONS` map (alphabetical position after `TrendingUp`/`Users` — keep alphabetical order in both places).

- [ ] **Step 2: `modules/listing/README.md`**

````markdown
# profitmaker-module-listing

ListingAPIs widgets for the Profitmaker terminal: a realtime listing feed, 7d/30d
trends and global stats — powered by [ListingAPIs](https://listingapis.com).

## Widgets

- **Live Listings** (`listing.live`) — realtime feed of new exchange listings
  (SSE). On each new listing: feed entry, toast, sound and auto-restore of a
  minimized widget (all toggleable in widget settings; filters by exchange and
  type).
- **Listing Trends** (`listing.trends`) — trending tickers and exchanges by
  listing velocity, 7d/30d windows.
- **Listing Stats** (`listing.stats`) — totals, 24h/7d/30d activity, top quote
  currencies.

## Setup

The terminal server needs two env vars (Bun loads `.env` automatically):

```
LISTINGAPIS_API_KEY=<MM API key from auth.marketmaker.cc>
LISTINGAPIS_API_URL=https://api.listingapis.com   # optional override
```

Without `LISTINGAPIS_API_KEY` the module installs cleanly and all widgets show
a configuration hint. API calls are billed per call to your MM balance.

## Install

Module Store → search `profitmaker-module-listing`, or:

```bash
curl -X POST http://localhost:3001/api/modules/install \
  -H 'content-type: application/json' \
  -d '{"package":"profitmaker-module-listing"}'
```

## Development

```bash
bun install
bun run test && bun run typecheck && bun run build
PROFITMAKER_DEV_MODULES=/abs/path/to/modules/listing bun run server:dev
```
````

- [ ] **Step 3: Full verification from repo root**

```bash
bun install
bun run typecheck          # all workspaces incl. module
bun run --filter profitmaker-module-listing test
bun run --filter profitmaker-module-listing build
bun run --filter '@profitmaker/client' test   # icon map change must not break registry tests
```

Expected: all green.

- [ ] **Step 4: Publish dry-run**

```bash
cd modules/listing && bun run build && npm publish --dry-run
```

Expected: tarball lists `dist/**`, `package.json`, `README.md`; manifest validates. Real publish (`npm publish`) only when the user asks.

- [ ] **Step 5: Commit**

```bash
git add modules/listing packages/client/src/modules/resolveIcon.tsx
git commit -m "feat(listing): zap icon, README, publish prep"
```

---

## Self-Review notes (already applied)

- Spec coverage: SSE single connection (Task 5), polling fallback (Task 5), 5-min poller + storage (Task 6), routes (Task 7), three widgets (Tasks 9–11), max-mode alerts with toast/sound/auto-restore (Tasks 8–9), 402/503/502 handling (Tasks 2, 7, 9), key server-side only (global constraint), packaging + npm (Tasks 1, 12). Spec said exchanges filter options "from backend cache" — implemented as `/exchanges` route fed by the poller (small spec addition, one extra cached upstream call per 5 min).
- `SseStatus` widened with `'inactive'` for the no-key `/status` response (noted in Task 7).
- One core edit total: `Zap` icon registration (documented extension point).
