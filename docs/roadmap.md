# Roadmap & Plans

## Current State (v3)

Profitmaker v3 is a working trading terminal with:
- Widget-based dashboard system (drag, resize, snap, collapse)
- Server-side data providers via a pluggable registry (built-in CCXT + module providers)
- Real-time WebSocket streaming via CCXT Pro + Socket.IO
- AES-256-GCM encryption for API keys
- 20+ trading widgets (chart, orderbook, trades, order form, portfolio, deals, etc.)

## Production Hardening

### Server Security
- [ ] Replace simple Bearer token with JWT authentication
- [ ] Add rate limiting (per IP and per token)
- [ ] Configure strict CORS (don't allow `*` in production)
- [ ] Enforce HTTPS only
- [ ] Move all secrets to environment variables
- [ ] Add IP allowlisting option

### Monitoring & Observability
- [ ] Structured logging (Pino or Winston)
- [ ] Prometheus metrics (request latency, cache hits, active subscriptions)
- [ ] Health check with detailed status (exchange connections, cache stats)
- [ ] Error tracking (Sentry integration)
- [ ] WebSocket connection monitoring dashboard

### Server Deployment
- [ ] Docker image with multi-stage build
- [ ] Docker Compose with server + Caddy (HTTPS)
- [ ] Kubernetes manifests (optional)
- [ ] Environment-specific configs (dev, staging, prod)

## Feature Roadmap 2026

### New API (Golang)
- [ ] High-performance history and real-time API in Go
- [ ] Aggregated order books across exchanges
- [ ] Time-series storage for historical candles/trades

### Backtesting Engine
- [ ] AI-powered backtesting engine
- [ ] Strategy editor with visual builder
- [ ] Historical data replay mode

### Portfolio Management
- [ ] Multi-exchange portfolio aggregation
- [ ] PnL tracking and analytics
- [ ] Tax reporting helpers
- [ ] Risk metrics (VaR, Sharpe, drawdown)

### Bot Framework
- [ ] Visual bot builder (drag-and-drop strategy blocks)
- [ ] Algorithmic trading strategies
- [ ] Paper trading mode
- [ ] Bot performance monitoring

### Metrics Engine
- [ ] Custom indicator builder
- [ ] Cross-exchange arbitrage detection
- [ ] Whale alert / large order detection
- [ ] Funding rate monitoring

### Platform
- [ ] Internationalization (i18n) — EN, RU, ZH already started
- [ ] DEX support (Uniswap, SushiSwap, etc.)
- [ ] Mobile-responsive layout
- [x] **Module system for community extensions** — full-stack modules (widget
  bundles + backend Elysia services) distributed as npm packages
  (`profitmaker-module` keyword), installed/enabled from an in-terminal Module
  Store. Dynamic `WidgetRegistry`, host `TerminalAPI` (`window.__PROFITMAKER__`),
  SDK (`@profitmaker/module-sdk`) with a vite preset, and a template module.
  See `docs/modules.md`.
  - [ ] Enforce declared `permissions` at runtime (currently declarative only)
  - [ ] MCP/CLI surface for AI-driven module authoring & install

## Provider Expansion

### MarketMaker.cc Integration
- [ ] `marketmaker.cc` provider type — enterprise data feed
- [ ] Premium analytics API
- [ ] Managed hosting with Profitmaker pre-installed

### Custom Server with Adapter
- [ ] `custom-server-with-adapter` provider type
- [ ] JSON schema-based adapter configuration
- [ ] Third-party data source plugins

## Known Issues / Improvements

### UserBalancesWidget
- USD value cache uses `exchange:currency:amount` key — should use `exchange:currency` for stability
- No rate-limiting on ticker requests — 50+ concurrent calls on load
- `getAllBalances()` runs in render without memoization

### UserTradingDataWidget
- Refresh uses tab-switch hack with setTimeout (50ms+200ms) — unreliable
- `useDataProviderStore()` without selector — subscribes to ALL store changes
- `accounts` in deps array creates new reference each render — causes infinite refetches
- Debug console.log statements should be removed for production

### General
- Main bundle is 1.7MB — needs code splitting and lazy loading
