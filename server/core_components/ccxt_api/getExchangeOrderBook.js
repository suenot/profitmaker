var {catchHead} = require('../../../utils')
var {initExchange} = require('./initExchange')

const getExchangeOrderBook = async function(exchange, symbol) {
  console.log('++++++', exchange, symbol)
  var id = await initExchange(exchange)

  var STOCK_NAME_UPPER = exchange.toUpperCase()

  if (global.CCXT[id].has['fetchOrderBook']) {
    await catchHead(global.CCXT[id].ratelimit, id)

    var data = await global.CCXT[id].fetchOrderBook(symbol)

    try {
      var bestpriceBid = data['bids'][0][0] || 9999999999999999999
      var bestpriceAsk = data['asks'][0][0] || 0
    } catch(err) {
        var bestpriceBid = 0
        var bestpriceAsk = 0
    }
    var [coinFrom, coinTo] = symbol.split('/')
    var bids = data['bids']
    var asks = data['asks']

    var orderBook = {
      'id': `${STOCK_NAME_UPPER}--${coinFrom}--${coinTo}`,
      'stock': STOCK_NAME_UPPER,
      'symbol': symbol,
      'base': coinFrom,
      'coinFrom': coinFrom, // deprecated
      'quote': coinTo,
      'coinTo': coinTo, // deprecated
      'pair': `${coinFrom}_${coinTo}`,
      'asks': asks,
      'bids': bids,
      'datetime': new Date(Date.now()),
      'timestamp': Date.now(),
      'bestpriceBid': bestpriceBid,
      'bestpriceAsk': bestpriceAsk
    }
    console.log(orderBook)
    return orderBook


  } else {
    return `${exchange} dont have fetchOrderBook method`
  }

}

exports.getExchangeOrderBook = getExchangeOrderBook
