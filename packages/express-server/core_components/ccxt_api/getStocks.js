const ccxt = require ('ccxt')
const _ = require ('lodash')

const getStocks = function() {
  var stocks = _.clone(ccxt.exchanges)
  stocks = stocks.map((stock)=>{
    return {
      id: stock,
      name: stock.toUpperCase(),
      status: 'active',
      rateLimit: global.CCXT[`${stock}--public`].rateLimit,
      channels: ['ccxt']
    }
  })
  return stocks
}

exports.getStocks = getStocks
