var {catchHead} = require('../../../utils')
var {initExchange} = require('./initExchange')

const getExchangeOHLCV = function(exchange, symbol, timeframe) {
  if (global.OHLCV[`${exchange}--${symbol}`] === undefined) {
    global.OHLCV[`${exchange}--${symbol}`] = []
  }
  getOHLCV(exchange, symbol, timeframe)
  return global.OHLCV[`${exchange}--${symbol}`]
}

const getOHLCV = async function(exchange, symbol, timeframe) {
  var id = await initExchange(exchange)
  if (global.CCXT[id].has['fetchOHLCV']) {
    await catchHead(global.CCXT[id].ratelimit, id)
    global.OHLCV[`${exchange}--${symbol}`]  = await global.CCXT[id].fetchOHLCV(symbol, timeframe)
  }
}


exports.getExchangeOHLCV = getExchangeOHLCV
