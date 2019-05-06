const ccxt = require ('ccxt')

var initExchange = async function(exchange) {
  for ( let [account, accountIn] of Object.entries(global.ACCOUNTS) ) {
    if (accountIn.stock === exchange && accountIn.parser === 'ccxt') {
      return {
        accountId: account,
        ccxtId: accountIn['safe']
      }
    }
  }
  if (global.CCXT[`${exchange}--public`] === undefined) {
    global.CCXT[`${exchange}--public`] = new ccxt[exchange] ({
      'enableRateLimit': true
    })
  }
  return {
    accountId: exchange,
    ccxtId: `${exchange}--public`
  }
}


exports.initExchange = initExchange
