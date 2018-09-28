## Quick start
1. Install mongo
```
docker volume create kupi-terminal-mongo-volume
docker run --name kupi-terminal-mongo -p 27017:27017 -v kupi-terminal-mongo-volume:/data/db -d mongo
```

2. Copy ignored by default files and fill stocks private keys in ```./private/keys.json```
```
cp -R ./defaults/. ./
```

3. Run terminal-server
```
cd server
npm run start
``` 

4. Run terminal-frontend
```
cd react-client
npm run start
```

## API:
#### server api:
```http://api.kupi.network/```
```
/coinmarketcap
/stocks
/binance/pairs
/binance/orders
/binance/orders/ETH_BTC
/binance/ohlcv
/binance/ohlcv/ETH_BTC
/binance/trades/ETH_BTC
```

#### terminal server api:
```http://localhost:8051/```
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
