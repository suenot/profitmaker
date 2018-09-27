const ccxt = require ('ccxt')
var {sleep, catchHead} = require('../../utils')
var {fetchOpenOrder} = require('./openOrders')

const cancelOrder = async function(data) {
  console.log('cancelOrder +++++++')
  console.log(data)
  var stockUpper = data.stock
  var stockName = stockUpper.toLowerCase()
  var symbol = data.symbol
  var id = data.id
  var _id = data._id
  var rateLimit = global.STOCKS[stockName]['rateLimit']
  await catchHead(rateLimit, stockName)
  var result = await global.STOCKS[stockName].cancelOrder(id, symbol)
  // var result = await cancel (stockName, id, symbol)
  await fetchOpenOrder(stockUpper, symbol, id, _id)
  return result
}

module.exports = cancelOrder
