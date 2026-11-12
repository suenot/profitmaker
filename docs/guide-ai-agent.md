# Drive the terminal with an AI agent

Profitmaker has one list of commands (create a dashboard, add a widget, read a
ticker, install a module) and exposes it three ways: REST, the `profitmaker`
CLI and an MCP server. An agent such as Claude Code connects over MCP and gets
31 tools. Whatever it changes shows up live in the open browser.

## 1. Run a server

Use your own install ([Self-host](getting-started.md) or [Docker](docker.md))
with `API_TOKEN` set. Open the terminal in a browser and keep the tab open:
the `ui_*` tools act on that open tab.

## 2. Connect the agent

In the profitmaker repo, add a `.mcp.json`:

```json
{
  "mcpServers": {
    "profitmaker": {
      "command": "bun",
      "args": ["packages/mcp/src/bin.ts"],
      "env": {
        "PROFITMAKER_URL": "http://localhost:3001",
        "PROFITMAKER_TOKEN": "your API_TOKEN here"
      }
    }
  }
}
```

Start Claude Code in that folder. Ask it to list the Profitmaker tools to
check the connection.

The token gives the agent full access to the bootstrap user. Keep `.mcp.json`
out of git if the token is real.

## 3. Ask for a layout

Plain words are enough:

> Make a dashboard called "Majors". Put a chart and an order book for BTC/USDT
> on bybit spot in one group on the left, and the same for ETH/USDT on the
> right.

The agent calls `dashboards_create`, `groups_create` and `widgets_add`, and
you watch the widgets appear. Then:

> Switch the left group to SOL/USDT and set its chart to 5-minute candles.

That is `groups_set_group_context` and `ui_set_widget_settings`.

## 4. Let it read the market

Tools such as `marketdata_get_ticker` and the order book and candle reads let
the agent answer questions from live data: "which of these five pairs has the
widest spread on bybit right now?"

## 5. Let it extend the terminal

The agent can also write code. Point it at
[Write your first module](guide-first-module.md) and ask for a widget, for
example "a widget that shows funding rate for the group's pair". It scaffolds a
module, writes the backend route and the React widget, builds it, and you load
it with `PROFITMAKER_DEV_MODULES`.

## Without MCP

The same commands as shell commands, for scripts and cron jobs:

```bash
export PROFITMAKER_URL=http://localhost:3001 PROFITMAKER_TOKEN=...
bun packages/cli/src/bin.ts dashboards list
bun packages/cli/src/bin.ts widgets add --dashboard-id <id> --type orderbook \
  --position '{"x":40,"y":80,"width":360,"height":420}'
```

And as plain HTTP: every command is a REST route, see [Server API](server-api.md).

## Limits today

- `ui_*` tools need a browser tab open on the same server and user. Without
  one they return `503 No UI client connected`.
- An agent cannot place orders through the control channel.
- Some module-widget settings can be read but not fully set.

The full list is in [Known issues](known-issues.md) and
[Remote control](remote-control.md).

## Try it

Ask your agent: "Create a dashboard with one chart per top-3 pair by 24h
volume on bybit spot." Check that the three charts appear in the browser
without a reload.
