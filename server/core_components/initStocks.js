const ccxt = require ('ccxt')

const initStocks = async function(privateKeys) {
  for (let [stockName, stock] of Object.entries(privateKeys)) {
    if ( global.STOCKS === undefined ) global.STOCKS = {}
    global.STOCKS[stockName] = new ccxt[stockName] ({
        'enableRateLimit': true,
        'apiKey': stock.apiKey,
        'secret': stock.secret
    })
  }
}
module.exports = initStocks
