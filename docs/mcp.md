# Profitmaker MCP Server

Drive a running Profitmaker terminal from an AI agent over the
[Model Context Protocol](https://modelcontextprotocol.io). The MCP server exposes
one tool per command in the shared command registry (`@profitmaker/mcp`), which
sits on top of the same REST + `ui:command` control surface documented in
[remote-control.md](remote-control.md). The CLI ([cli.md](cli.md)) is the same
registry behind a `profitmaker` shell command.

## Setup

The server talks to a running terminal server (boot it per
[server-api.md](server-api.md)). It is configured by two env vars:

| Var | Default | Meaning |
|-----|---------|---------|
| `PROFITMAKER_URL` | `http://localhost:3001` | Terminal server HTTP base. |
| `PROFITMAKER_TOKEN` | _(none)_ | Bearer token. Use the server's `API_TOKEN` (resolves to the single bootstrap user — perfect for an agent), or a session/SSO token for a specific user. |

### `.mcp.json`

```jsonc
{
  "mcpServers": {
    "profitmaker": {
      "command": "bun",
      "args": ["packages/mcp/src/bin.ts"],
      "env": {
        "PROFITMAKER_URL": "http://localhost:3001",
        "PROFITMAKER_TOKEN": "your-api-token"
      }
    }
  }
}
```

Or via the CLI's stable entrypoint (after `bun add @profitmaker/cli` or in-repo):

```jsonc
{ "mcpServers": { "profitmaker": { "command": "profitmaker", "args": ["mcp"],
  "env": { "PROFITMAKER_URL": "http://localhost:3001", "PROFITMAKER_TOKEN": "your-api-token" } } } }
```

## How errors surface

Every tool returns the server's response as JSON text. On failure the tool result
is flagged `isError` and the message is passed through **verbatim** — so an agent
sees the real cause: a `503 No UI client connected` for a `ui_*` tool when no
browser is open, a `400` zod validation message, or a connection error when the
server is down. `ui_*` tools (and `dashboards_set_active`) require a browser tab
to be open and connected to the same server/user.

## Tool reference

REST-backed tools take effect immediately and stream to any open browser via
`state:changed`. `ui_*` tools require a connected browser (they round-trip a
`ui:command`). Parameters in `code` are required; `name?` are optional.

| Tool | Params | Description |
|------|--------|-------------|
| `dashboards_list` | — | List all dashboards for the current user (id, title, isDefault). Use this first to discover dashboard ids. |
| `dashboards_get` | `dashboardId` | Get one dashboard with all of its widgets (positions, types, groups, visibility). |
| `dashboards_create` | `title`, description?, isDefault? | Create a new dashboard (a tab in the terminal). Returns the created dashboard incl. its new id. Appears live in any open browser. |
| `dashboards_update` | `dashboardId`, title?, description?, isDefault?, layout? | Update a dashboard's title/description/layout/isDefault. Only the fields you pass change. |
| `dashboards_delete` | `dashboardId` | Delete a dashboard and all of its widgets (cascades). The tab disappears live. |
| `dashboards_set_active` | `dashboardId` | Switch the active dashboard tab in the live UI (ui:command). Requires a browser to be open and connected; returns 503 otherwise. |
| `widgets_list_types` | — | List every widget type that can be added: the built-in types plus any module-provided widget types (`<moduleId>.<widget>`). Call before widgets_add. |
| `widgets_list` | `dashboardId` | List the widgets on a dashboard. |
| `widgets_add` | `dashboardId`, `type`, `position`, defaultTitle?, userTitle?, groupId?, config?, showGroupSelector?, isVisible? | Add a widget. `type` from widgets_list_types. `position` is pixels {x,y,width,height}. Bind to a group (groupId) so it follows that group's instrument. Appears live. |
| `widgets_update` | `widgetId`, userTitle?, config?, groupId?, showGroupSelector?, isVisible?, isMinimized? | Update a widget's title, config, group binding, or visibility. Only passed fields change. |
| `widgets_move` | `widgetId`, `x`, `y` | Move a widget to a new {x,y} pixel position (keeps its current size). Moves live. |
| `widgets_resize` | `widgetId`, `width`, `height` | Resize a widget (keeps its position). Visible live. |
| `widgets_remove` | `widgetId` | Remove a widget from its dashboard. Disappears live. |
| `groups_list` | — | List instrument groups. A group carries an exchange/market/tradingPair context; widgets bound to it all follow it. |
| `groups_create` | `name`, color?, tradingPair?, exchange?, market?, account?, description? | Create an instrument group. Bind widgets to it so they all show the same instrument. |
| `groups_set_group_context` | `groupId`, tradingPair?, exchange?, market?, account? | Change a group's instrument context. EVERY widget bound to it retargets live — chart, order book and trades resubscribe to the new symbol. |
| `groups_assign_widget` | `widgetId`, `groupId` | Bind a widget to a group. |
| `marketdata_list_exchanges` | — | List every exchange id the server can serve market data for. |
| `marketdata_get_capabilities` | `exchange`, market?, providerId? | Get an exchange's capabilities as reported by the serving provider. |
| `marketdata_get_candles` | `exchange`, `symbol`, market?, providerId?, timeframe?, limit? | Fetch recent OHLCV candles. Returns [ts, o, h, l, c, v] arrays. |
| `marketdata_get_orderbook` | `exchange`, `symbol`, market?, providerId?, limit? | Fetch the current order book (bids/asks). |
| `marketdata_get_recent_trades` | `exchange`, `symbol`, market?, providerId?, limit? | Fetch the most recent public trades. |
| `marketdata_get_ticker` | `exchange`, `symbol`, market?, providerId? | Fetch the latest ticker (last/bid/ask/volume). |
| `providers_list_available` | — | List server-side data/trading providers (id, displayName, exchanges, priority, fromModule). Pass an id as `providerId` to market-data tools. Built-in is "ccxt". |
| `modules_search` | `query` | Search npm for installable Profitmaker modules. |
| `modules_install` | `name`, version? | Install a module from npm (no server restart). |
| `modules_enable` | `id` | Enable an installed module (no restart). |
| `modules_disable` | `id` | Disable an installed module (no restart). |
| `ui_get_ui_state` | — | Ask the live UI what it shows: active dashboard id + open widgets (id+type). Requires a connected browser. |
| `ui_bring_widget_to_front` | `dashboardId`, `widgetId` | Raise a widget's z-order in the live UI. Requires a connected browser. |
| `ui_set_widget_settings` | `widgetId`, `widgetType`, `settings` | Apply per-widget settings live (e.g. `{ "timeframe": "5m" }` for a chart). Requires a connected browser. |

_31 tools._

## Worked scenario — "create a scalping dashboard for BTC/USDT on bybit"

An agent prompt like _"create a scalping dashboard with orderbook + trades + chart
for BTC/USDT on bybit"_ maps to:

1. `widgets_list_types` → confirm `chart`, `orderbook`, `trades` are available.
2. `dashboards_create` `{ "title": "Scalping BTC" }` → returns `dashboardId`.
3. `groups_create` `{ "name": "Scalp", "tradingPair": "BTC/USDT", "exchange": "bybit", "market": "spot", "color": "#00BCD4" }` → returns `groupId`.
4. `widgets_add` ×3 with `dashboardId`, `groupId`, and a `type` + `position`:
   - chart `{ "x": 20, "y": 80, "width": 700, "height": 420 }`
   - orderbook `{ "x": 740, "y": 80, "width": 320, "height": 420 }`
   - trades `{ "x": 1080, "y": 80, "width": 320, "height": 420 }`
5. `dashboards_set_active` `{ "dashboardId": … }` → the user's browser switches to the new tab.
6. (optional) `marketdata_get_ticker` `{ "exchange": "bybit", "symbol": "BTC/USDT" }` to confirm data is flowing.
7. Later: `groups_set_group_context` `{ "groupId": …, "tradingPair": "ETH/USDT" }` retargets all three widgets at once; `ui_set_widget_settings` sets the chart timeframe; `ui_get_ui_state` reads back what the user sees.

This exact flow is exercised end to end (and asserted) by
`scripts/stage3-scenario.ts` — see [cli.md](cli.md).
