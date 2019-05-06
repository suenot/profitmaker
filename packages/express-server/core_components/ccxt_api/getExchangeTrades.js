var {catchHead} = require('@kupi/catchHead')
const _ = require ('lodash')
var {initExchange} = require('./initExchange')


const getExchangeTrades = function(exchange, symbol) {
  if (global.TRADES[`${exchange}--${symbol}`] === undefined) {
    global.TRADES[`${exchange}--${symbol}`] = []
  }
  getTrades(exchange, symbol)
  return global.TRADES[`${exchange}--${symbol}`]
}

const getTrades = async function(exchange, symbol) {
  var {ccxtId} = await initExchange(exchange)
  if (global.CCXT[ccxtId].has['fetchTrades']) {
    await catchHead(global.CCXT[ccxtId].rateLimit, ccxtId)
    var result = await global.CCXT[ccxtId].fetchTrades(symbol)
    result = _.sortBy(result, [function(o) { return parseInt(o.timestamp) }])
    global.TRADES[`${exchange}--${symbol}`] = result
  }
}


exports.getExchangeTrades = getExchangeTrades
