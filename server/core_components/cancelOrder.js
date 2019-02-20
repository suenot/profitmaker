const ccxt = require ('ccxt')
var {catchHead} = require('../../utils')
var {fetchOpenOrder} = require('./openOrders')

const cancelOrder = async function(data) {
  var accountId = data.accountId
  try {
    var ccxtId = global.ACCOUNTS[accountId].notSafe
  } catch (err) {
    return 'need notSafe key for cancelOrder'
  }
  var symbol = data.symbol
  var id = data.id
  var _id = data._id
  var rateLimit = global.CCXT[ccxtId]['rateLimit']
  await catchHead(rateLimit, ccxtId)
  console.log(ccxtId, id, symbol)
  var result = await global.CCXT[ccxtId].cancelOrder(id, symbol)
  fetchOpenOrder(accountId, symbol, id, _id)
  return result
}

module.exports = cancelOrder
