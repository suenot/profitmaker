const ccxt = require ('ccxt')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead

const updateOpenOrders = async function(db, privateKeys, timeout) {
  while (true) {
    for (let [stockName, stock] of Object.entries(privateKeys)) {
      await marketOpenOrders(stockName, db)
    }
    await sleep(timeout)
    console.log('openOrders')
  }
}

const marketOpenOrders = async function(stockName, db) {
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    var stockNameUpper = stockName.toUpperCase()
    if (global.STOCKS[stockName].has['fetchOrders']) {
      await catchHead(rateLimit, stockName)
      var data = await global.STOCKS[stockName].fetchOrders()
      // console.log(stockName, data)
    } else {
      // console.log(stockName, 'tot support fetchOrders')
      await catchHead(rateLimit, stockName)
      var data = await global.STOCKS[stockName].fetchOpenOrders()
      // console.log(stockName, data)
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
    await db.collection('openOrders').replaceOne({'stock': stockNameUpper}, res, {upsert: true})



  } catch (err) { console.log(err) }
}

module.exports = updateOpenOrders
