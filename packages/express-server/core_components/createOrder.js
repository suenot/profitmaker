
var {catchHead} = require('@kupi/catchHead')
var {getCCXTId} = require('./getCCXTId')
var {fetchOpenOrder} = require('./openOrders')

const createOrder = async function(data) {
  var accountId = data.accountId
  var ccxtId = getCCXTId(accountId, 'notSafe')
  // TODO разобраться с символами
  var ccxtSymbol = data.pair.split('_').join('/')
  var side =  data.type.toLowerCase()
  var amount = data.amount
  var price = data.price
  var rateLimit = global.CCXT[ccxtId]['rateLimit']
  await catchHead(rateLimit, ccxtId)
  var result = await global.CCXT[ccxtId].createOrder(ccxtSymbol, 'limit', side, amount, price) /// ('BTC/USD', 'limit', 'buy', 1, 2500.00)
  fetchOpenOrder(accountId, ccxtSymbol, result.id)
  return result
}
module.exports = createOrder
