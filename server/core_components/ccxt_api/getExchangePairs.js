var {initExchange} = require('./initExchange')
var {catchHead} = require('@kupi/catchHead')

const getExchangePairs = function(exchange) {
  if (global.PAIRS[`${exchange}`] === undefined) {
    global.PAIRS[`${exchange}`] = []
  }
  getPairs(exchange)
  return global.PAIRS[`${exchange}`]
}

const getPairs = async function(exchange) {
  var {ccxtId} = await initExchange(exchange)
  await catchHead(global.CCXT[ccxtId].rateLimit, ccxtId)

  var data = await global.CCXT[ccxtId].loadMarkets()
  var symbols = []
  for (var key in data) {
    var symbol = data[key]['symbol']
    symbols.push(symbol)
  }
  global.PAIRS[`${exchange}`] = symbols
}



exports.getExchangePairs = getExchangePairs
