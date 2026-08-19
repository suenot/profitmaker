# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog and versions follow Semantic Versioning.

## [Unreleased]

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
