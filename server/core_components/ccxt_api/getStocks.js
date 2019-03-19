import ccxt from 'ccxt'
import _ from 'lodash'

const getStocks = function() {
  var stocks = _.clone(ccxt.exchanges)
  stocks = stocks.map((stock)=>{
    return {
      id: stock,
      name: stock.toUpperCase(),
      status: 'active'
    }
  })
  return stocks
}

exports.getStocks = getStocks
