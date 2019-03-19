var {catchHead} = require('../../../utils')
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
  console.log('++++++', exchange, symbol)
  var id = await initExchange(exchange)

  if (global.CCXT[id].has['fetchTrades']) {
    await catchHead(global.CCXT[id].ratelimit, id)
    var result = await global.CCXT[id].fetchTrades(symbol)
    result = _.sortBy(result, [function(o) { return parseInt(o.timestamp) }])
    global.TRADES[`${exchange}--${symbol}`] = result
  }
}


exports.getExchangeTrades = getExchangeTrades
