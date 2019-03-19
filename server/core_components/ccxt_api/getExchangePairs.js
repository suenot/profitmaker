var {initExchange} = require('./initExchange')
var {catchHead} = require('../../../utils')

const getExchangePairs = function(exchange) {
  if (global.PAIRS[`${exchange}`] === undefined) {
    global.PAIRS[`${exchange}`] = []
  }
  getPairs(exchange)
  return global.PAIRS[`${exchange}`]
}

const getPairs = async function(exchange) {
  var id = await initExchange(exchange)
  await catchHead(global.CCXT[id].ratelimit, id)
  var data = await global.CCXT[id].loadMarkets()
  var symbols = []
  for (var key in data) {
    var symbol = data[key]['symbol']
    symbols.push(symbol)
  }
  global.PAIRS[`${exchange}`] = symbols
}



exports.getExchangePairs = getExchangePairs
