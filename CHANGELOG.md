# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog and versions follow Semantic Versioning.

## [Unreleased]

## [3.2.0] - 2026-08-20

### Added

- Add authenticated CCXT Pro private order, trade, and derivative-position streams for the scalper and DOM.
- Add a canonical private-state ledger with client/exchange order ID correlation, event deduplication, monotonic fills, and terminal-state protection.

### Changed

- Use private streams as the primary live account-state source wherever the exchange supports them, with REST snapshots for startup, reconnect recovery, safety confirmation, and fallback.
- Describe Profitmaker.cc as the open source terminal and MarketMaker.cc as the home of the quantitative research team working on several projects, including Profitmaker.

### Fixed

- Backfill account state before and after private-stream startup so fills cannot disappear in the subscription gap.
- Reauthenticate, resubscribe, and reconcile after Socket.IO or CCXT Pro reconnects while rejecting late events from older runtime generations.
- Keep leased CCXT Pro runtimes out of TTL/LRU eviction until their private subscription is released.
- Allow unauthenticated Socket.IO subscriptions for public market-data channels while continuing to require authentication for account data.
- Label cancel and reduce-only close responses as accepted requests rather than confirmed final account state.

## [3.1.4] - 2026-08-20

### Changed

- Upgrade CCXT from 4.5.45 to 4.5.74.
- Preserve the legacy `coinbaseadvanced`, `gateio`, and `huobi` exchange IDs after their removal from CCXT.
- Clarify that MarketMaker.cc is a separate product and that its automated quoting engine is not included in this repository.

### Fixed

- Reconcile open orders and the live position before emergency flattening so a fill racing with cancellation cannot leave exposure sized from stale state.
- Assign client order IDs to every entry, close, stop-loss, and take-profit order path.
- Report the installed CCXT package version in health checks despite the incorrect ESM runtime constant in CCXT 4.5.74.

## [3.1.3] - 2026-08-17

### Fixed

- Pass the postpaid usage metering feature flag into the production server container.

## [3.1.2] - 2026-08-17

### Fixed

- Align usage ingestion and signed pricing snapshots with the registered `profitmaker` service identifier.

## [3.1.1] - 2026-08-17

### Security

- Verify the auth-service HMAC before accepting a cached pricing snapshot.

## [3.1.0] - 2026-08-17

### Added

- Non-blocking postpaid usage checkpoints for authenticated Socket.IO market-data subscriptions.
- Cached default-free operation pricing and billing metadata in subscription acknowledgements.

### Changed

- Streaming usage is measured by active logical subscription time; reconnect, heartbeat and provider outage time remain free.
