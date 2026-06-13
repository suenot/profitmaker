# Profitmaker CLI

`profitmaker` is a shell command for driving a running terminal — the same
command registry the [MCP server](mcp.md) exposes to agents, behind
`profitmaker <domain> <verb> --flags`. Humans and scripts use the CLI; AI agents
use MCP; both share one implementation so behaviour never drifts.

## Setup

Configured by the same env vars as everything else:

```bash
export PROFITMAKER_URL=http://localhost:3001   # default
export PROFITMAKER_TOKEN=your-api-token        # server API_TOKEN, or a session/SSO token
```

Run in-repo with `bun packages/cli/src/bin.ts …`, or install the package and use
the `profitmaker` bin.

## Usage

```bash
profitmaker --help                 # list domains
profitmaker dashboards --help      # list a domain's verbs
profitmaker dashboards create --help   # flags for one command (derived from its schema)
```

Commands print their JSON result to stdout; errors (validation, a server 4xx/5xx,
or an unreachable server) go to stderr with a non-zero exit — so they compose in
scripts.

### Flags

Flags come straight from each command's input schema:

- `--kebab-case` for `camelCase` fields (e.g. `--dashboard-id`).
- booleans are presence flags (`--is-default`); everything else takes a value.
- values that look like JSON are parsed, so objects/arrays/numbers work:
  `--position '{"x":20,"y":80,"width":700,"height":420}'`.

### Examples

```bash
# Discover and create
profitmaker widgets list-types
DASH=$(profitmaker dashboards create --title "Scalping BTC" | jq -r .id)
GROUP=$(profitmaker groups create --name Scalp --trading-pair BTC/USDT \
          --exchange bybit --market spot --color '#00BCD4' | jq -r .id)

# Add widgets bound to the group
profitmaker widgets add --dashboard-id "$DASH" --type chart \
  --position '{"x":20,"y":80,"width":700,"height":420}' --group-id "$GROUP"

# Live data
profitmaker marketdata get-ticker --exchange bybit --symbol BTC/USDT

# Drive the open UI (needs a browser connected to the same server)
profitmaker dashboards set-active --dashboard-id "$DASH"
profitmaker ui set-widget-settings --widget-id "$W" --widget-type chart \
  --settings '{"timeframe":"5m"}'

# Retarget every widget on the group at once
profitmaker groups set-group-context --group-id "$GROUP" --trading-pair ETH/USDT
```

See [mcp.md](mcp.md#tool-reference) for the full list of commands (the CLI verbs
are the tool names with `_` → ` `, e.g. `dashboards_set_active` →
`dashboards set-active`).

## Extra commands

- `profitmaker mcp` — run the stdio MCP server (the stable `.mcp.json`
  entrypoint; see [mcp.md](mcp.md)).
- `profitmaker module scaffold <id> [--dir <dir>]` — create a new module from
  `templates/module-template`, renaming the placeholder id everywhere (package
  name, `profitmaker.id`, `<id>.*` widget types). Then `cd <id> && bun install &&
  bun run build`. See [modules.md](modules.md).

## End-to-end scenario

`scripts/stage3-scenario.ts` drives the full "scalping dashboard" scenario
through the CLI binary and asserts every step (create dashboard + group +
chart/orderbook/trades, live ticker/candles, providers list, `ui:command`
set-active + chart timeframe, group retarget to ETH/USDT, move/resize,
`get_ui_state`, remove):

```bash
PROFITMAKER_URL=http://localhost:3001 PROFITMAKER_TOKEN=test-token \
  bun scripts/stage3-scenario.ts        # --keep to leave the dashboard in place
```

With a browser open on the same server, the UI follows live (the tab switches,
widgets appear/move).
