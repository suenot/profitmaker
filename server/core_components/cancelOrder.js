const ccxt = require ('ccxt')
var {catchHead} = require('../../utils')
var {fetchOpenOrder} = require('./openOrders')
var {getCCXTId} = require('./getCCXTId')

const cancelOrder = async function(data) {
  try {
    var accountId = data.accountId
    var ccxtId = getCCXTId(accountId, 'notSafe')
    var symbol = data.symbol
    var id = data.id
    var _id = data._id
    var rateLimit = global.CCXT[ccxtId]['rateLimit']
    await catchHead(rateLimit, ccxtId)
    var result = await global.CCXT[ccxtId].cancelOrder(id, symbol)
    fetchOpenOrder(accountId, symbol, id, _id)
    return result
  } catch (err) {
    return err
  }

}

module.exports = cancelOrder
