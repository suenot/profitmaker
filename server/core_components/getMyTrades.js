var catchHead = require('../../utils').catchHead

const getMyTrades = async function(stockName, symbol) {
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    if (global.STOCKS[stockName].has['fetchMyTrades']) {
      await catchHead(rateLimit, stockName)
      var trades = await global.STOCKS[stockName].fetchMyTrades(symbol)
      // console.log(stockName, symbol, trades)
      return trades
    } else {
      return {'Error': stockName + ' havent  fetchMyTrades'}
    }
  } catch (err) { console.log(err) }
}
module.exports = getMyTrades