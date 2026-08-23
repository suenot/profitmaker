# profitmaker-module-listing

ListingAPIs widgets for the Profitmaker terminal: a realtime listing feed, 7d/30d
trends and global stats — powered by [ListingAPIs](https://listingapis.com).

## Widgets

- **Live Listings** (`listing.live`) — realtime feed of new exchange listings
  (SSE). On each new listing: feed entry, toast, sound and auto-restore of a
  minimized widget (all toggleable in widget settings; filters by exchange and
  type).
- **Listing Trends** (`listing.trends`) — trending tickers and exchanges by
  listing velocity, 7d/30d windows.
- **Listing Stats** (`listing.stats`) — totals, 24h/7d/30d activity, top quote
  currencies.

## Setup

The terminal server needs two env vars (Bun loads `.env` automatically):

```
LISTINGAPIS_API_KEY=<MM API key from auth.marketmaker.cc>
LISTINGAPIS_API_URL=https://api.listingapis.com   # optional override
```

Without `LISTINGAPIS_API_KEY` the module installs cleanly and all widgets show
a configuration hint. API calls are billed per call to your MM balance.

## Install

Module Store → search `profitmaker-module-listing`, or:

```bash
curl -X POST http://localhost:3001/api/modules/install \
  -H 'content-type: application/json' \
  -d '{"package":"profitmaker-module-listing"}'
```

## Development

```bash
bun install
bun run test && bun run typecheck && bun run build
PROFITMAKER_DEV_MODULES=/abs/path/to/modules/listing bun run server:dev
```
