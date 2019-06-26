## Vocabulary

### Base

**task** – this is the task for the script to track the trading position (emulated wrapper over the order)
order is an exposed / realized / partially_realized position on the stock

**orders_queue** – queue for order execution (to work with rate limit)

**stock** – current stock stock for trading (alt. in ccxt – stock)

**market** – global_market / stock, which we are looking at, in order to base prices on which it is possible to sell the desired coin with 100% confidence (it could be a coinmarketcap, or maybe a binance, or maybe some other stock)

**pair** – a pair (alt. in ccxt: symbol), example DNT_BTC (in ccxt: DNT/BTC)

**coin** - crypto coin or another trading instrument

**coin_from** – the left part of the pair, small coin (in ccxt: base)

**coin_to** – the right side of the pair, a large coin (in ccxt: quote)

**stock_from** – on which stock we buy

**stock_to** – on which stock we sell

### Keys

**public_key** – the public part of the key for working with the stock (in config: apiKey)

**private_key** – the private part of the key to work with the stock (in config: secret)

**safe_apiKey** – key only for orders, trades, balances, my_orders, my_trades

**notSafe_apiKey** – key only for buy / sell

**danger_apiKey** – key only for withdraw (not realized yet)

### Kupi

**kupi_server** – is an external service, not open source, parses public data from a multitude of exchanges and gives away free of charge for api: trades, orders, candles

**kupi_backend** – kupi_server backend

**kupi_api** – api kupi_server

### Client

**ccxt** – aggregator library, to work with a large number of exchanges in the same style

**ccxt_api** – api to work with ccxt, that realized in ```client_backend```

### Client

**client_server** – the hardware on which ``client_backend``` runs

**client_backend** – express js server that is responsible for authorization, working with keys, working with ccxt_api and kupi_api

**client_api** – api raised in ```client_backend```

**client_frontend** – interface on react/vue to work with ```client_backend``` via ```client_api```
