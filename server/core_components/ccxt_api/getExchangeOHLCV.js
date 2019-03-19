
var {catchHead} = require('../../../utils')
var {initExchange} = require('./initExchange')

const getExchangeOHLCV = async function(exchange, symbol, timeframe) {
  console.log('++++++ OHLCV', exchange, symbol)
  var id = await initExchange(exchange)
  if (global.CCXT[id].has['fetchOHLCV']) {
    await catchHead(global.CCXT[id].ratelimit, id)
    var data = await global.CCXT[id].fetchOHLCV(symbol, timeframe)
    return data
  } else {
    return `${exchange} dont have fetchOHLCV method`
  }
}


exports.getExchangeOHLCV = getExchangeOHLCV
