const _ = require('lodash')

const balanceAvailable = function(stock, pair, accountId) {
  try {
    var [coinFrom, coinTo] = pair.split('_')
    return {
      buy: global.BALANCE[accountId]['data'][coinTo].free,
      sell: global.BALANCE[accountId]['data'][coinFrom].free
    }
  } catch(err) {
    return {
      buy: 0,
      sell: 0
    }
  }

}

exports.balanceAvailable = balanceAvailable
