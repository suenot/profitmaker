var catchHead = require('../../utils').catchHead

const getMyTrades = async function(stockName, symbol) {
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    if (global.STOCKS[stockName].has['fetchMyTrades']) {
      await catchHead(rateLimit, stockName)
      var trades = await global.STOCKS[stockName].fetchMyTrades(symbol)
      var id = `${stockName}--${symbol}`
      global.MYTRADES[id] = trades
      return trades
    } else {
      return {'Error': stockName + ' havent fetchMyTrades'}
    }
  } catch (err) { console.log(err) }
}

const getMyTradesFromVariable = async function(stockName, symbol) {
  try {
    getMyTrades(stockName, symbol)
    var id = `${stockName}--${symbol}`
    var trades = global.MYTRADES[id]
    return trades
  } catch (err) { console.log(err) }
}

exports.getMyTrades = getMyTrades
exports.getMyTradesFromVariable = getMyTradesFromVariable
