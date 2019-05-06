var {catchHead} = require('@kupi/catchHead')
var {initExchange} = require('./initExchange')

const getExchangeOrderBook = function(exchange, symbol) {
  if (global.ORDERBOOK[`${exchange}--${symbol}`] === undefined) {
    global.ORDERBOOK[`${exchange}--${symbol}`] = {}
  }
  getOrderBook(exchange, symbol)
  return global.ORDERBOOK[`${exchange}--${symbol}`]
}

const getOrderBook = async function(exchange, symbol) {
  var {ccxtId} = await initExchange(exchange)
  var STOCK_NAME_UPPER = exchange.toUpperCase()
  if (global.CCXT[ccxtId].has['fetchOrderBook']) {
    await catchHead(global.CCXT[ccxtId].rateLimit, ccxtId)
    var data = await global.CCXT[ccxtId].fetchOrderBook(symbol)
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
    global.ORDERBOOK[`${exchange}--${symbol}`] = {
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
  }
}

exports.getExchangeOrderBook = getExchangeOrderBook
