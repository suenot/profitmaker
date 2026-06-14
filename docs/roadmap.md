# Roadmap & Plans

## Current State (v3)

Profitmaker v3 is a working trading terminal with:
- Widget-based dashboard system (drag, resize, snap, collapse)
- Server-side data providers via a pluggable registry (built-in CCXT + module providers)
- Real-time WebSocket streaming via CCXT Pro + Socket.IO
- AES-256-GCM encryption for API keys
- 20+ trading widgets (chart, orderbook, trades, order form, portfolio, deals, etc.)

### Recently shipped
- **Central accounts** — exchange API keys live server-side in the `auth.marketmaker.cc`
  vault; the terminal sends `{ accountId, want }` + the user's JWT and the backend
  fetches decrypted keys server-to-server. The browser never holds secrets.
- **Multiple simultaneous logins** — hold several ecosystem identities at once and
  quick-switch the active one.
- **Per-account read-only access levels** — accounts can be shared read-only; trade
  operations on a read grant are rejected server-side (403).
- **All trading widgets on real data** — Portfolio (cross-account allocation),
  Transaction History (via `fetchLedger`), Order Form (live balance + ticker), and
  Deals / My Trades / User Balances / User Trading Data (via central accounts). The
  old "not ready" placeholders are gone.
- **Design-system status bar** — MarketMaker `TimezoneToggle` clock and a real
  server connection indicator.
- **KuCoin Broker Pro attribution** — hosted KuCoin trades carry the MarketMaker
  broker partner id for rebates (no-op for self-host unless broker env vars are set).

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
- No rate-limiting on ticker requests — many concurrent calls on load
- `getAllBalances()` runs in render to keep Zustand auto-subscription (intentional, but should be revisited)
- Debug `console.log` statements should be removed for production

### General
- Main bundle is 1.7MB — needs code splitting and lazy loading
