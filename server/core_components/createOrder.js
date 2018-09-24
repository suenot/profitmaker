const ccxt = require ('ccxt')
var {sleep, create, catchHead} = require('../../utils')
var fetchOpenOrder = require('./openOrders').fetchOpenOrder

const createOrder = async function(data) {
  var stockUpper = data.stock
  var stockName = stockUpper.toLowerCase()
  var symbol = data.pair.split('_').join('/')
  var side =  data.type
  var amount = data.amount
  var price = data.price
  var result = await create (stockName, symbol, side, amount, price)
  console.log(result)
  await fetchOpenOrder(stockUpper, symbol, result.id)
  return result
}
module.exports = createOrder
