const ccxt = require ('ccxt')
var {catchHead} = require('../../utils')
var fetchOpenOrder = require('./openOrders').fetchOpenOrder

const createOrder = async function(data) {
  var accountId = data.accountId
  try {
    var ccxtId = global.ACCOUNTS[account].notSafe
  } catch (err) {
    return 'need notSafe key for createOrder'
  }
  var symbol = data.pair.split('_').join('/')
  var side =  data.type.toLowerCase()
  var amount = data.amount
  var price = data.price
  var rateLimit = global.CCXT[ccxtId]['rateLimit']
  await catchHead(rateLimit, ccxtId)

  var result = await global.CCXT[ccxtId].createOrder(symbol, 'limit', side, amount, price) /// ('BTC/USD', 1, 2500.00)
  console.log(result)
  fetchOpenOrder(accountId, symbol, result.id)
  return result
}
module.exports = createOrder
