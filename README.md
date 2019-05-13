# Kupi-terminal – crypto currency trading terminal

[![License](https://img.shields.io/badge/licence-GPL--2.0-blue.svg)](https://raw.githubusercontent.com/kupi-network/kupi-terminal/master/LICENSE) [![Discord](https://img.shields.io/discord/430374279343898624.svg?color=4D64BA&label=chat%20on%20discord)](https://discord.gg/2PtuMAg) ![Version](https://img.shields.io/badge/express_server-0.6.0-blue.svg) ![Version](https://img.shields.io/badge/react_client-0.6.0-blue.svg) ![Version](https://img.shields.io/badge/vue_client-0.2.0-blue.svg) [![codecov](https://codecov.io/gh/kupi-network/kupi-terminal/branch/master/graph/badge.svg)](https://codecov.io/gh/kupi-network/kupi-terminal) [![Codacy Badge](https://api.codacy.com/project/badge/Grade/a0b7b6b595fd4b3db3818fed7665b1bf)](https://www.codacy.com/app/suenot/kupi-terminal?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=kupi-network/kupi-terminal&amp;utm_campaign=Badge_Grade) [![Build Status](https://travis-ci.org/kupi-network/kupi-terminal.svg?branch=master)](https://travis-ci.org/kupi-network/kupi-terminal)

Open source, customized, extendable trading terminal that supports 130+ crypto stocks.

[![Demo](https://github.com/kupi-network/kupi-terminal/blob/master/demo.png?raw=true)](http://demo.kupi.network/)

## [Demo](#demo) ·[How it works](#how-it-works) · [Features](#features) · [Technologies](#technologies) · [Warning](#warning) · [Quick start](#quick-start) · [Exchange markets](https://github.com/kupi-network/kupi-terminal/blob/master/MARKETS.md) · [React vs Vue](https://github.com/kupi-network/kupi-terminal/blob/master/REACT_VS_VUE.md) · [API](#api) · [Privacy policy](https://github.com/kupi-network/kupi-terminal/blob/master/PRIVACY_POLICY.md) · [Terms of use](https://github.com/kupi-network/kupi-terminal/blob/master/TERMS_OF_USE.md) · [Changelog](https://github.com/kupi-network/kupi-terminal/blob/master/CHANGELOG.md) · [Roadmap](https://github.com/kupi-network/kupi-terminal/blob/master/ROADMAP.md) · [Support us](#support-us) · [Team](#team) · [Contact us](#contact-us)

## Demo

React version: [https://kupi.network/](https://kupi.network/)

Vue version: [https://vue.kupi.network/](https://vue.kupi.network/)

## How it works

![Demo](https://github.com/kupi-network/kupi-terminal/blob/master/structure.png?raw=true)

## Sponsored Promotion

Want this place? Contact us: https://www.facebook.com/dexenot

![Placehodler](https://user-images.githubusercontent.com/1707/48204972-43569e00-e37c-11e8-9cf3-b86e3dc19ee9.png)

## Features

- Open source
- Your api keys stay on your machine, no need to send its anywhere
- Customized with dashboards and widgets
- Extendable with users modules
- Free realtime API (Timeseries will be in immediate future)
- Framework for creating trading bots

## Technologies

- [React](https://github.com/facebook/react), [react-grid-layout](https://github.com/STRML/react-grid-layout), [material-ui](https://github.com/mui-org/material-ui)
- [Vue](https://github.com/vuejs/vue), [vue-grid-layout](https://github.com/jbaysolutions/vue-grid-layout), [element](https://github.com/ElemeFE/element), [movue](https://github.com/nighca/movue), [v-charts](https://github.com/ElemeFE/v-charts)
- [Mobx](https://github.com/mobxjs/mobx)
- [Express](https://github.com/expressjs/express)
- [Mongo](https://github.com/mongodb/mongo)
- [CCXT](https://github.com/ccxt/ccxt)
- [Flaticon](https://www.flaticon.com/)
- [Echarts](https://github.com/apache/incubator-echarts)

## WARNING

THE SOFTWARE UNDER HEAVY DEVELOPMENT. PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

## Quick start

[Install with docker](https://github.com/kupi-network/kupi-terminal/blob/master/INSTALL_WITH_DOCKER.md)

[Install manually](https://github.com/kupi-network/kupi-terminal/blob/master/INSTALL_MANUALLY.md)

If you had any problems with installing we can help in [voice/text Discrod chat](https://discord.gg/2PtuMAg)

## API

### Server api

Server: [https://kupi.network/api](https://kupi.network/api) (secure) or [http://kupi.network/api](http://kupi.network/api) (faster)

Swagger: [try api online](https://app.swaggerhub.com/apis/soloviofff/kupi.network/1.0.0#/)

```bash
/stocks
/binance/pairs
/binance/orders/ETH_BTC
/binance/trades/ETH_BTC
/binance/candles/ETH_BTC/1m # timeframes: ['1m', '3m', '5m', '15m', '30m', '1H', '2H', '4H', '6H', '12H', 'D', 'W', 'M']
/coinmarketcap
```

#### terminal server api:

```http://localhost:8051/```

```bash
/balance
/openOrders/:stock/:pair
/myTrades/:stock/:pair
/cancelOrder
/createOrder
```

### Support us

ETH [0x159d7BD659dd362423E1487c5952ab0f6C79Bec3](https://etherscan.io/address/0x159d7BD659dd362423E1487c5952ab0f6C79Bec3)

Thank you!

## Team

- Eugen Soloviov [github](https://github.com/suenot) [facebook](https://www.facebook.com/dexenot)
- Sergey Soloviov [github](https://github.com/soloviofff)
- Igor Korotin [github](https://github.com/markolofsen)
- Alexander Plugari (adviser)

## Contact Us

For business inquiries contact with [Eugen Soloviov](https://www.facebook.com/dexenot)
