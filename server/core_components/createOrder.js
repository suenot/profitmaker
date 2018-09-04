const ccxt = require ('ccxt')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead


const createOrder = async function(data) {

  try {
    console.log(data)
    var stockUpper = data.stock
    var stockLower = stockUpper.toLowerCase()
    var pair = data.pair.split('_')


    // if ( data.type === 'buy' ) {
    //     var balance = global.BALANCE[stockUpper]['data'][pair[1]]['free']
    //     console.log(balance, pair[1], data.amount)
    // } else if ( data.type === 'sell' ) {
    //     var balance = global.BALANCE[stockUpper]['data'][pair[0]]['free']
    //     console.log(balance, pair[0], data.amount)
    // }
    //
    // if (balance < data.amount) {
    //   console.log('not enought balance to this action')
    //   return ['not enought balance to this action']
    // }

    // global.STOCKS[stockLower]
    var rateLimit = global.STOCKS[stockLower]['rateLimit']
    await catchHead(rateLimit, stockLower)
    console.log('trade')
  } catch(err) {console.log(err)}


  // console.log(data)
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
