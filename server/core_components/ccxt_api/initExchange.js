const ccxt = require ('ccxt')

var initExchange = async function(exchange) {
  console.log('-------')
  if (global.CCXT[`${exchange}--public`] === undefined) {
    global.CCXT[`${exchange}--public`] = new ccxt[exchange] ({
      'enableRateLimit': true
    })
  } else {
    return
  }
}


exports.initExchange = initExchange
