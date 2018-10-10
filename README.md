![Demo](https://github.com/kupi-network/kupi-terminal/blob/master/demo.png?raw=true)

## About
Open source, customized, extendable trading terminal that supports multiple crypto stocks. 

## Features
- Open source
- Your api keys stay on your machine, no need to send them anywhere
- Customized with dashboards and widgets
- Extendable with users modules
- Free realtime API (Timeseries will be in immediate future)
- Framework for creating trading bots

## Technologies
- [React](), [react-grid-layout](https://github.com/STRML/react-grid-layout), [material-ui](https://github.com/mui-org/material-ui)
- [Vue](), [vue-grid-layout](https://github.com/jbaysolutions/vue-grid-layout), [vuetify](https://github.com/vuetifyjs/vuetify)
- [Mobx](https://github.com/mobxjs/mobx)
- [Express](https://github.com/expressjs/express)
- [Mongo](https://github.com/mongodb/mongo)
- [CCXT](https://github.com/ccxt/ccxt)
- [Flaticon](https://www.flaticon.com/)

## Quick start
0. If you had problems with installing we can help in [voice/text Discrod chat](https://discord.gg/Q77C8v)

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
