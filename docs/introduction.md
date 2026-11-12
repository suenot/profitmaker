# Introduction

Profitmaker is a source-available crypto trading terminal you can take apart and
rebuild. It gives you a canvas of widgets (charts, order books, trades,
balances, order forms) on top of 100+ exchanges through CCXT, and every part of
it can be changed: by you in the UI, by your code as a module, or by an AI agent
through MCP.

Think of it as a base kit. The terminal you see on first run is one assembly of
the parts. A scalping desk, a market-making monitor, a listing scanner or a bot
control panel are other assemblies of the same parts.

## Two ways to run it

| | Hosted | Self-hosted |
|---|---|---|
| Where | [terminal.marketmaker.cc](https://terminal.marketmaker.cc) | your machine or server |
| Setup | none, sign in with MarketMaker | Bun + PostgreSQL, or Docker |
| Exchange keys | stored in the MarketMaker vault, never in the browser | sent per request, held in memory only |
| Modules | install from the Module Store | install, or write your own and load them live |
| Best for | trying it, trading from a browser | changing the code, private setups, agents on your own server |

Start hosted to see what it does: [Hosted quickstart](hosted-quickstart.md).
Run it yourself when you want to change it: [Self-host](getting-started.md) or
[Docker](docker.md).

## What makes it different

**Built to be customized.** Dashboards are free-form canvases. Widgets snap to a
grid, can be grouped so that one instrument change retargets a whole group, and
each user keeps their own layouts. Nothing about the default layout is special.

**AI-native.** Everything you can do with the mouse, an agent can do too. The
server exposes one command registry three ways: a REST API, a `profitmaker`
CLI, and an MCP server with 31 tools. An agent can create a dashboard, place
and bind widgets, read market data and install modules, and the open browser
updates live while it works. See [Drive the terminal with an AI agent](guide-ai-agent.md).

**A platform for your own code.** A module is an npm package with a frontend
(React widgets) and a backend (routes, background jobs, storage, a Socket.IO
channel, shared CCXT access). Built-in widgets are modules too, so yours sit
next to them as equals. See [Write your first module](guide-first-module.md).

**Source available.** The code is on [GitHub](https://github.com/suenot/profitmaker)
under the MIT license with the Commons Clause: use it, change it, run it for
yourself, but do not sell it as a product or service.

## How the pieces fit

```
Browser (React + Vite)          Agents and scripts
  widgets, dashboards             MCP server, CLI, curl
        │                                │
        └──── REST + Socket.IO ──────────┘
                     │
          Profitmaker server (Bun + Elysia)
          auth · dashboards · modules · CCXT
                     │
        PostgreSQL        100+ exchanges via CCXT
```

The browser holds no exchange logic of its own: all market data and trading go
through the server. That one fact is what lets an agent and a human share the
same live terminal. Details are in [Architecture](architecture.md).

## Where to go next

- New here: [Hosted quickstart](hosted-quickstart.md), then [Build your first dashboard](guide-first-dashboard.md).
- Want to run it: [Self-host from source](getting-started.md) or [Docker](docker.md).
- Want to automate it: [AI agent guide](guide-ai-agent.md), [MCP reference](mcp.md), [CLI reference](cli.md).
- Want to extend it: [Write your first module](guide-first-module.md), [Modules reference](modules.md).
