const ccxt = require ('ccxt')
var {catchHead} = require('../../../utils')
const _ = require ('lodash')

var {initExchange} = require('./initExchange')


const getExchangeTrades = async function(exchange, symbol) {
  console.log('++++++', exchange, symbol)
  var id = await initExchange(exchange)

  if (global.CCXT[id].has['fetchTrades']) {
    await catchHead(global.CCXT[id].ratelimit, id)
    var result = await global.CCXT[id].fetchTrades(symbol)
    result = _.sortBy(result, [function(o) { return parseInt(o.timestamp) }])
    console.log(result)
    return result
  } else {
    return `${exchange} dont have fetchTrades method`
  }

}


exports.getExchangeTrades = getExchangeTrades
