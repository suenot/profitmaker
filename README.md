## Quick start
First, need to set /private key for
### /private/keys.json
```js
{
    "keys": {
        "binance": {
            "apiKey": "apiKey",
            "secret": "secret"
        },
        "liqui": {
            "apiKey": "apiKey",
            "secret": "secret"
        },
        "cryptopia": {
            "apiKey": "apiKey",
            "secret": "secret"
        }
    },
    "ethPockets": {
      "eth_pocket_name_free": {
        "address": "eth_address"
      }
    }
}
```

## API:
#### server api:
```http://kupi.network:8051/```
```
/coinmarketcap
/stocks
/stocks/info <PLAN>
/pairs
/pairs/:stock
/pairs/:stock/info <PLAN>
/orders
/orders/:stock <PLAN>
/orders/:stock/:pair
/ohlcv
/ohlcv/:stock <PLAN>
/ohlcv/:stock/:pair
/trades <PLAN>
/trades/:stock <PLAN>
/trades/:stock/:pair
```

#### terminal server api:
```http://kupi.network:8051/```
```
/balance
/openOrders/:stock/:pair
/myTrades/:stock/:pair
/cancelOrder
/createOrder
/trades/:stock/:pair
/stocks
/pairs/:stock
/orders/:stock/:pair
/ohlcv/:stock/:pair
```

## Roadmap of developemnt
### bigdata
- websocket
- imporove speed of information from stocks (now it can be in 0.2-10s, depends by stock)
- ohlcv time_series
- orders time_series
- trades time_series
- more reliability
### terminal
- websocket
- add/remove widgets
- add/remove dashboards
- dashboards with color_groups of widgets (2+ stocks on one page)
- free arbitrage signals (one signal in one hands)
- free strategies that really works
- bots
  - dashboard for monitoring bots work
  - emulator trades based on realtime data
  - emulator trades based on history
- i18n language support
- analytics widgets
- more stocks
- tests
### dex
- franchise
- ethereum
  - options/features/financial_instruments
  - shorts
- qtum
  - options/features/financial_instruments
  - shorts
- sidechain
  - options/features/financial_instruments
  - shorts
- another blockchains
- tests

## TODO:
1. Rerender without triggering window resize
```js
onLayoutChange={(layout, layouts) => {
    this.onLayoutChange(layout, layouts)
    window.dispatchEvent(new Event('resize'))
  }
}
```
