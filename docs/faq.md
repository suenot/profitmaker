# FAQ

## Is it free?

The code is free to use, change and run for yourself. The license is MIT with
the Commons Clause, which forbids selling the software itself, or a hosted
service whose value comes mainly from it. Running it for your own trading is
fine.

## Hosted or self-hosted?

Start hosted at [terminal.marketmaker.cc](https://terminal.marketmaker.cc) to
see what it does. Self-host when you want to change the code, keep everything
on your own machine, or let an agent work with it on your server. See
[Introduction](introduction.md#two-ways-to-run-it).

## Where are my exchange keys?

Hosted: in the MarketMaker vault. The terminal server fetches them only to sign
a request, and the browser never gets them. Self-hosted without sign-in: in
memory for one request, never on disk. See [Security](security.md).

## Which exchanges work?

Every exchange CCXT supports for market data, more than 100. Trading support
depends on what CCXT implements for that exchange.
`marketdata_list_exchanges` (MCP) or `profitmaker marketdata list-exchanges`
prints the list your server can serve.

## The terminal shows a yellow "needs an access token" banner

The server is up but did not accept this browser. Click **Enter token** and
paste the server's `API_TOKEN`, or sign in with MarketMaker. See
[Self-host](getting-started.md#5-start-the-client).

## Live data does not update behind my proxy

Socket.IO runs on `PORT + 1`. Route `/socket.io` to it and set
`ALLOWED_ORIGINS` to your site's origin. See [Docker](docker.md#on-a-server-with-a-domain).

## Can an AI agent trade for me?

Not through the control channel. Agents can build dashboards, read market
data and write modules. Placing orders stays with you in the order panel.

## Can I add my own indicator or data source?

Yes. An indicator or a signal is a module with a widget. A data source is a
provider module. See [Write your first module](guide-first-module.md) and
[Data providers](data-providers.md).

## Does it run on a phone?

It runs in a mobile browser, but dragging widgets by touch is unreliable. A
desktop browser works best.
