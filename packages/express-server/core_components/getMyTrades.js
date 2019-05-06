var {catchHead} = require('@kupi/catchHead')

const getMyTrades = async function(account, symbol) {
  try {
    if (global.ACCOUNTS[account].parser === 'ccxt' && global.ACCOUNTS[account].notSafe !== '') {
      if (global.CCXT[global.ACCOUNTS[account].notSafe].has['fetchMyTrades']) {
        var rateLimit = global.CCXT[global.ACCOUNTS[account].notSafe]['rateLimit']
        await catchHead(rateLimit, global.ACCOUNTS[account].notSafe)
        var trades = await global.CCXT[global.ACCOUNTS[account].notSafe].fetchMyTrades(symbol)
        var id = `${account}--${symbol}`
        global.MYTRADES[id] = trades
        return trades
      } else {
        return {'Error': account + ' havent fetchMyTrades'}
      }
    } else {
      return {'Error': account + ' havent key for this operation'}
    }
  } catch (err) { console.log(err) }
}

const getMyTradesFromVariable = async function(account, symbol) {
  try {
    getMyTrades(account, symbol)
    var id = `${account}--${symbol}`
    var trades = global.MYTRADES[id]
    return trades
  } catch (err) { console.log(err) }
}

exports.getMyTrades = getMyTrades
exports.getMyTradesFromVariable = getMyTradesFromVariable
