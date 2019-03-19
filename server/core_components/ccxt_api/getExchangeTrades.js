const ccxt = require ('ccxt')
var {catchHead} = require('../../../utils')
const _ = require ('lodash')

var {initExchange} = require('./initExchange')


const getExchangeTrades = async function(exchange, symbol) {
  console.log('++++++')
  await initExchange(exchange)
  if (global.CCXT[`${exchange}--public`].has['fetchTrades']) {
    // console.log(global.CCXT[`${exchange}--public`])
    await catchHead(global.CCXT[`${exchange}--public`])
    var result = await global.CCXT[`${exchange}--public`].fetchTrades(symbol)
    result = _.sortBy(result, [function(o) { return parseInt(o.timestamp) }])

    return result
  } else {
    return `${exchange} dont have fetchTrades method`
  }


}


exports.getExchangeTrades = getExchangeTrades
