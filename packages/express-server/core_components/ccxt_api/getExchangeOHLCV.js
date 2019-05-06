var {catchHead} = require('@kupi/catchHead')
var {initExchange} = require('./initExchange')

const getExchangeOHLCV = function(exchange, symbol, timeframe) {
  if (global.OHLCV[`${exchange}--${symbol}`] === undefined) {
    global.OHLCV[`${exchange}--${symbol}`] = []
  }
  getOHLCV(exchange, symbol, timeframe)
  return global.OHLCV[`${exchange}--${symbol}`]
}

const getOHLCV = async function(exchange, symbol, timeframe) {
  var {ccxtId} = await initExchange(exchange)
  if (global.CCXT[ccxtId].has['fetchOHLCV']) {
    await catchHead(global.CCXT[ccxtId].rateLimit, ccxtId)
    global.OHLCV[`${exchange}--${symbol}`]  = await global.CCXT[ccxtId].fetchOHLCV(symbol, timeframe)
  }
}


exports.getExchangeOHLCV = getExchangeOHLCV
