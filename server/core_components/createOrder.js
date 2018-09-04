const ccxt = require ('ccxt')
var {sleep, create, catchHead} = require('../../utils')

const createOrder = async function(data) {
  try {
    var stockUpper = data.stock
    var stockName = stockUpper.toLowerCase()
    var symbol = data.pair.split('_').join('/')
    var side =  data.type
    var amount = data.amount
    var price = data.price
    return await create (stockName, symbol, side, amount, price)
  } catch(err) {
    return err
    console.log(err)
  }
}

// { stock: 'BITFINEX',
//   pair: 'ETH_BTC',
//   type: 'sell',
//   price: '2',
//   amount: '3' }
module.exports = createOrder

// var rateLimit = global.STOCKS[stockLower]['rateLimit']
// await catchHead(rateLimit, stockLower)
// var limits = await global.STOCKS[stockLower].fetchMarkets ()
