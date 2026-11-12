# Profitmaker documentation

Profitmaker is a source-available crypto trading terminal built to be taken
apart: widgets on a free canvas, 100+ exchanges through CCXT, your own code as
modules, and AI agents driving it through MCP. Built with Bun, Elysia, React
and Socket.IO.

These files are also published at
[profitmaker.cc/docs](https://www.profitmaker.cc/docs/).

## Getting started

| Page | What it covers |
|---|---|
| [Introduction](introduction.md) | What it is, hosted vs self-hosted, how the pieces fit |
| [Hosted quickstart](hosted-quickstart.md) | Sign in at terminal.marketmaker.cc and connect an exchange |
| [Self-host from source](getting-started.md) | Bun, PostgreSQL, server and client on your machine |
| [Run with Docker](docker.md) | One compose file, plus a reverse proxy for a domain |

## Concepts

| Page | What it covers |
|---|---|
| [Architecture](architecture.md) | Workspaces, data flow, tech stack |
| [Widgets](widgets.md) | Widget types, groups, building new widgets |
| [Data providers](data-providers.md) | CCXT on the server, provider registry, WebSocket vs REST |
| [State management](state-management.md) | Zustand stores, persistence, server sync |
| [Remote control](remote-control.md) | How agents and scripts drive the open UI |

## Guides

| Page | What it covers |
|---|---|
| [Build your first dashboard](guide-first-dashboard.md) | A scalping desk with one instrument group |
| [Drive the terminal with an AI agent](guide-ai-agent.md) | `.mcp.json`, layouts from plain words, live updates |
| [Write your first module](guide-first-module.md) | Scaffold, a backend route, a widget, dev loading |
| [Theming](theming.md) | Dark and light mode, CSS variables |

## Reference

| Page | What it covers |
|---|---|
| [MCP tools](mcp.md) | All 31 tools with parameters |
| [CLI](cli.md) | The `profitmaker` command |
| [Modules and SDK](modules.md) | Manifest, backend context, widget API, publishing |
| [Server API](server-api.md) | REST endpoints and Socket.IO events |
| [Configuration](configuration.md) | Every environment variable |

## More

| Page | What it covers |
|---|---|
| [Security](security.md) | Where keys live, auth paths, credential tiers |
| [Known issues](known-issues.md) | What does not work yet |
| [FAQ](faq.md) | Short answers |
| [Roadmap](roadmap.md) | What comes next |

Contributing: see [CONTRIBUTING.md](../CONTRIBUTING.md). For agents,
[llms.txt](llms.txt) lists these pages in one file.
