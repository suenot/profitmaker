# Profitmaker v3 Documentation

Crypto trading terminal supporting 100+ exchanges via CCXT. Built with React, Elysia, and Bun.

## Table of Contents

| Document | Description |
|----------|-------------|
| [Getting Started](getting-started.md) | Install, setup, first run |
| [Architecture](architecture.md) | Workspace structure, data flow, tech stack |
| [Widgets](widgets.md) | All widget types, creating new widgets |
| [State Management](state-management.md) | Zustand stores, patterns, persistence |
| [Data Providers](data-providers.md) | CCXT integration, server provider + registry, WebSocket vs REST |
| [Server API](server-api.md) | REST endpoints, Socket.IO events |
| [Security](security.md) | API key encryption, master password, credential tiers |
| [Theming](theming.md) | Dark/light mode, CSS variables, terminal palette |
| [Roadmap](roadmap.md) | Production plans, feature roadmap 2026, known issues |

## Quick Links

- **Source code**: `packages/` directory (types, sdk, server, client)
- **Dev commands**: `bun dev` (client :8080); server: `bun --cwd packages/server dev` (:3001, needs `DATABASE_URL` + `API_TOKEN`)
- **Tech stack**: Bun + React 18 + Vite + Zustand + Elysia + Socket.IO + CCXT
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)
