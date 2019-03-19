const ccxt = require ('ccxt')

var initExchange = async function(exchange) {
  for ( let [account, accountIn] of Object.entries(global.ACCOUNTS) ) {
    if (accountIn.stock === exchange && accountIn.parser === 'ccxt') {
      return accountIn.safe
    }
  }
  if (global.CCXT[`${exchange}--public`] === undefined) {
    global.CCXT[`${exchange}--public`] = new ccxt[exchange] ({
      'enableRateLimit': true
    })
    return `${exchange}--public`
  } else {
    return `${exchange}--public`
  }
}


exports.initExchange = initExchange
