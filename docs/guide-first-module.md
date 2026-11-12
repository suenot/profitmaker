# Write your first module

A module adds your own code to the terminal: a backend (HTTP routes, background
jobs, storage, live pushes, shared exchange access) and a frontend (React
widgets). In this guide you make a module called `my-signals` and give it one
real feature: the bid-ask spread of any pair, in basis points.

You need a [self-hosted install from source](getting-started.md) with the
server and client running.

## 1. Scaffold it

From the repo root:

```bash
bun packages/cli/src/bin.ts module scaffold my-signals
bun install
cd modules/my-signals
bun run build
```

The scaffold copies `templates/module-template` into `modules/my-signals` and
renames the ids. It has to live in `modules/`: the SDK is not published to npm
yet, so the module gets it from the repo's workspace. `bun install` at the root
links it.

What you get:

```
modules/my-signals/
├── package.json         manifest under the "profitmaker" key
├── src/backend/index.ts routes, a heartbeat job, storage
└── src/frontend/index.tsx the widget
```

The template's display name still says "Example Module". Change
`displayName` and `description` in `package.json` to your own.

## 2. Load it into the server

Stop the server and start it again with the module path:

```bash
PROFITMAKER_DEV_MODULES="$PWD/modules/my-signals" \
DATABASE_URL=... API_TOKEN=... bun run server:dev
```

(run from the repo root; the path must be absolute). Check that it loaded:

```bash
curl -s -H "Authorization: Bearer $API_TOKEN" http://localhost:3001/api/modules
curl -s -H "Authorization: Bearer $API_TOKEN" \
  http://localhost:3001/api/modules/my-signals/hello
```

The first lists `my-signals` with `"dev": true`. The second answers
`{"message":"hello from the example module backend","id":"my-signals",...}`.

## 3. Add a route

Routes are written relative to the module. The server mounts them under
`/api/modules/my-signals`, so `.get('/spread')` becomes
`/api/modules/my-signals/spread`.

In `src/backend/index.ts`, add this to the `routes` chain, after the
`/ticker` route:

```ts
      // GET /api/modules/my-signals/spread?exchange=bybit&symbol=BTC/USDT
      .get('/spread', async ({ query, set }) => {
        const exchange = (query.exchange as string) || 'bybit';
        const symbol = (query.symbol as string) || 'BTC/USDT';
        try {
          const ex = (await ctx.ccxt.getInstance({ exchangeId: exchange })) as {
            fetchOrderBook(s: string, limit?: number): Promise<{ bids: number[][]; asks: number[][] }>;
          };
          const book = await ex.fetchOrderBook(symbol, 5);
          const bid = book.bids[0]?.[0];
          const ask = book.asks[0]?.[0];
          if (bid === undefined || ask === undefined) {
            set.status = 404;
            return { error: 'empty order book' };
          }
          const mid = (bid + ask) / 2;
          return { exchange, symbol, bid, ask, spreadBps: ((ask - bid) / mid) * 10_000 };
        } catch (err) {
          set.status = 502;
          return { error: err instanceof Error ? err.message : String(err) };
        }
      })
```

`ctx.ccxt` is the server's shared CCXT pool, so your module does not open its
own exchange connections.

Rebuild and call it:

```bash
bun run build
curl -s -H "Authorization: Bearer $API_TOKEN" \
  "http://localhost:3001/api/modules/my-signals/spread?exchange=bybit&symbol=BTC/USDT"
```

You should see something like
`{"exchange":"bybit","symbol":"BTC/USDT","bid":74035.7,"ask":74035.8,"spreadBps":0.0135}`.
With `server:dev` the server reloads the rebuilt backend by itself. With
`bun run server`, restart it.

A spread of 0.0135 bps means the best bid and best ask are one tick apart.
One basis point is 0.01%.

## 4. Show it in a widget

Add the widget to a dashboard. From the UI: right-click the canvas, the
module's widget is listed with the others. From the CLI:

```bash
bun packages/cli/src/bin.ts widgets list-types     # my-signals.hello is there
bun packages/cli/src/bin.ts widgets add --dashboard-id <id> --type my-signals.hello \
  --position '{"x":40,"y":80,"width":360,"height":240}'
```

To show the spread, call your route from the widget in
`src/frontend/index.tsx`. The host adds the auth header for you:

```tsx
const res = await getTerminal().api.fetch(
  `/api/modules/my-signals/spread?exchange=${group.exchange}&symbol=${group.symbol}`,
);
const { spreadBps } = await res.json();
```

Frontend changes need `bun run build` and a page reload. Dev modules are served
with `no-cache`, so you get the new bundle.

## 5. Ship it

A module is an npm package with the `profitmaker-module` keyword. Publish it and
it shows up in every terminal's Module Store search. Until the SDK itself is
on npm, a module built outside this repo cannot resolve its SDK dependency, so
publishing is for modules built here. See [Modules](modules.md#build--publish).

## Try it

Make the route also return `spreadPct` (the spread in percent). Rebuild, curl
it, and check that `spreadPct` equals `spreadBps / 100`.

## Where to read more

- [Modules reference](modules.md): manifest fields, the full backend context,
  permissions, the widget API, theming.
- `templates/module-template/AGENTS.md`: the same loop written for an AI agent,
  if you want one to write the module for you.
