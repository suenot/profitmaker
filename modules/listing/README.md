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

## Per-user billing

Live listings bill the viewing user's own ListingAPIs key, not the operator's:
the terminal mints a 168h service key per signed-in user through the
auth-service internal bridge (re-minted transparently on expiry) and opens one
upstream SSE stream per user. Per-user data is available to SSO-linked users
only — the mint is keyed on the auth-service account id, so terminal-local
accounts without an auth link see the `sign in required` state on Live. Each
of those users needs:

- the `listingapis` service role on their account at
  [auth.marketmaker.cc](https://auth.marketmaker.cc),
- an MM balance — live listing calls are billed per call to it.

Trends, Stats and the status badge run on the operator's shared
`LISTINGAPIS_API_KEY` (~3 calls / 5 min), so those widgets work for every user
regardless of role.

The Live widget surfaces its failure states as a banner: `sign in required`
(no session), `listingapis subscription required at auth.marketmaker.cc` (user
lacks the `listingapis` role), `busy, retrying` (stream pool full or
auth-service briefly unavailable).

## Setup

The terminal server reads env vars (Bun loads `.env` automatically):

```
AUTH_INTERNAL_SECRET=<internal secret shared with auth-service>  # required for Live
AUTH_INTERNAL_URL=https://auth.marketmaker.cc                    # optional override
LISTINGAPIS_API_KEY=<MM API key from auth.marketmaker.cc>        # optional, shared widgets only
LISTINGAPIS_API_URL=https://api.listingapis.com                  # optional override
```

`AUTH_INTERNAL_SECRET` is the same secret auth-service checks on the
`X-Internal-Secret` header of its internal routes — the per-user key bridge
needs it. The module never crashes on a missing var: without
`AUTH_INTERNAL_SECRET` it still installs and `/stream` answers 503; without
`LISTINGAPIS_API_KEY` the shared widgets show a configuration hint.

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
