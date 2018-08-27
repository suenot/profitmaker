const ccxt = require ('ccxt')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead


const updateTradesHistory = async function(db, privateKeys, timeout) {
  for (let [stockName, stock] of Object.entries(privateKeys)) {

      const updateTradesHistoryStock = async function() { // TODO change name
        while (true) {
          // console.log('++')
          await tradesHistory(db, stockName)
          // console.log('tradesHistory', stockName)
          await sleep(timeout)
        }
      }
      updateTradesHistoryStock()
    }
}

const fetchMyTradesByOne = async function(rateLimit, stockName) {
  var data = []
  await catchHead(rateLimit, stockName)
  var markets = await global.STOCKS[stockName].loadMarkets()
  for (let [key, value] of Object.entries(markets)) {
    // console.log(data)
    try {
      await catchHead(rateLimit, stockName)
      var partial = await global.STOCKS[stockName].fetchMyTrades(symbol = value.symbol, since = undefined, limit = undefined, params = {})
      // console.log(stockName, symbol, partial)
    } catch (err) { sleep(500) }
    if (partial != []) {
      for (var elemTrade of partial) {
        // console.log(elemTrade)
        data.push(elemTrade)
      }
    }
  }
  return data
}

const tradesHistory = async function(db, stockName) {
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    var stockNameUpper = stockName.toUpperCase()
    if (global.STOCKS[stockName].has['fetchMyTrades']) { // TODO что если биржа убогая

      try {
        await catchHead(rateLimit, stockName)
        var data = await global.STOCKS[stockName].fetchMyTrades()
        // console.log(stockName)
      } catch (err) {
        // console.log(err)
        var data = await fetchMyTradesByOne(rateLimit, stockName)
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
      if ( global.TRADESHISTORY === undefined ) global.TRADESHISTORY = {}
      if ( global.TRADESHISTORY[stockNameUpper] === undefined ) global.TRADESHISTORY[stockNameUpper] = {}
      global.TRADESHISTORY[stockNameUpper] = res
      await db.collection('tradesHistory').replaceOne({'stock': stockNameUpper}, res, {upsert: true})
    }
  } catch (err) { console.log(err) }
}

module.exports = updateTradesHistory
