const ccxt = require ('ccxt')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead

const updateOpenOrders = async function(privateKeys, timeout) {
  while (true) {
    for (let [stockName, stock] of Object.entries(privateKeys)) {
      await marketOpenOrders(stockName)
    }
    await sleep(timeout)
    console.log('openOrders')
  }
}
const marketOpenOrdersByOne = async function(stockName) {
  try {
    var data = []
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    await catchHead(rateLimit, stockName)
    var markets = await global.STOCKS[stockName].loadMarkets()
    for (let [key, value] of Object.entries(markets)) {
      try {
        await catchHead(rateLimit, stockName)
        var partial = await global.STOCKS[stockName].fetchOpenOrders(symbol = value.symbol, since = undefined, limit = undefined, params = {})
        // console.log(stockName, symbol, partial)
      } catch (err) { sleep(500) }
      if (partial != []) {
        for (var elemTrade of partial) {
          // console.log(stockName, elemTrade)
          data.push(elemTrade)
        }
      }
    }
    return data
  } catch (err) { console.log(err) }
}

const marketOpenOrders = async function(stockName) {
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    var stockNameUpper = stockName.toUpperCase()
    try {
      if (global.STOCKS[stockName].has['fetchOrders']) {
        await catchHead(rateLimit, stockName)
        var data = await global.STOCKS[stockName].fetchOrders()
        // console.log(stockName, data)
      } else {
        console.log(stockName, 'not support fetchOrders, go to marketOpenOrdersByOne')
        await catchHead(rateLimit, stockName)
        var data = await marketOpenOrdersByOne(stockName)
        // console.log(stockName, data)
      }
    } catch (err) {
      var data = await marketOpenOrdersByOne(stockName)
    }


    // console.log(data)
    var res = {
        "stock": stockNameUpper,
        "timestamp": Date.now(),
        "datetime": new Date(Date.now())
    }
    for ( let trade of data) {
      if ( res[trade.symbol] === undefined ) res[trade.symbol] = []
      res[trade.symbol].push(trade)
    }

    if ( global.OPENORDERS === undefined ) global.OPENORDERS = {}
    if ( global.OPENORDERS[stockNameUpper] === undefined ) global.OPENORDERS[stockNameUpper] = {}
    global.OPENORDERS[stockNameUpper] = res
    await global.MONGO.collection('openOrders').replaceOne({'stock': stockNameUpper}, res, {upsert: true})



  } catch (err) { console.log(err) }
}

module.exports = updateOpenOrders
