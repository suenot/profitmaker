# Changelog

All notable changes to this project are documented in this file.

The format follows Keep a Changelog and versions follow Semantic Versioning.

## [Unreleased]

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
