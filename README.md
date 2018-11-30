![Demo](https://github.com/kupi-network/kupi-terminal/blob/master/demo.png?raw=true)

## Demo without user API data
http://demo.kupi.network/

## About
Open source, customized, extendable trading terminal that supports multiple crypto stocks. 

## How it works
![Demo](https://github.com/kupi-network/kupi-terminal/blob/master/structure.png?raw=true)

## Warning
Terminal under heavy development. In current version trades processing by routing on client express.js server without authorization. In near future it will be fixed. But server works on 127.0.0.1 (not in 0.0.0.0) and others computers from internet or lan can't use terminal.

## Features
- Open source
- Your api keys stay on your machine, no need to send its anywhere
- Customized with dashboards and widgets
- Extendable with users modules
- Free realtime API (Timeseries will be in immediate future)
- Framework for creating trading bots

## Technologies
- [React](https://github.com/facebook/react), [react-grid-layout](https://github.com/STRML/react-grid-layout), [material-ui](https://github.com/mui-org/material-ui)
- [Vue](https://github.com/vuejs/vue), [vue-grid-layout](https://github.com/jbaysolutions/vue-grid-layout), [vuetify](https://github.com/vuetifyjs/vuetify)
- [Mobx](https://github.com/mobxjs/mobx)
- [Express](https://github.com/expressjs/express)
- [Mongo](https://github.com/mongodb/mongo)
- [CCXT](https://github.com/ccxt/ccxt)
- [Flaticon](https://www.flaticon.com/)

## Quick start
[Install with docker](https://github.com/kupi-network/kupi-terminal/blob/master/INSTALL_WITH_DOCKER.md)

[Install manually](https://github.com/kupi-network/kupi-terminal/blob/master/INSTALL_MANUALLY.md)

If you had any problems with installing we can help in [voice/text Discrod chat](https://discord.gg/Q77C8v)


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
/binance/candles/ETH_BTC/1m // timeframes: ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '12H', 'D', 'W', 'M']
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
```

## Plan for developemnt

### bigdata
- websocket
- improve speed of information from stocks (now it can be in 0.2-30s, depends by stock)
- ohlcv time_series
- orders time_series
- trades time_series
- more reliability

### terminal
- websocket
- dashboards with color_groups of widgets (2+ stocks on one page)
- free arbitrage signals (one signal in one hands)
- free strategies that really works
- free bots
  - widgets for monitoring bots work
  - emulator trades based on realtime data
  - emulator trades based on history (backtesting)
- i18n language support
- analytics widgets
- more stocks
- docker version
- app version based on electron
- online version
- improve security
- auditing
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

## Buy me a coffee
ETH: 0x159d7BD659dd362423E1487c5952ab0f6C79Bec3
