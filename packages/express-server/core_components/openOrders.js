var {sleep} = require('@kupi/sleep')
var {catchHead} = require('@kupi/catchHead')
var {getCCXTId} = require('./getCCXTId')
const {ObjectId} = require('mongodb')
const _ = require ('lodash')

//1
const openOrders = async function(ms) {
  // проверяем в БД известные нам открытые ордера и отправляем их на проверку
  try {
    while (true) {
      var dataToParse = await getOpenOrdersFromDB()
      if (!_.isEmpty(dataToParse)) {
        await createParseLists(dataToParse)
      }
      await sleep(ms)
    }
  } catch (err) { console.log(err)}
}
// 1.2
const getOpenOrdersFromDB = async function() {
  try {
    var data = await global.MONGO.collection('openOrders').find({}).toArray()
    if (_.isEmpty(data)) {
      return {}
    } else { return data }
  } catch (err) { console.log(err)}
}

// 1.3
const createParseLists = async function(data) {
  try {
    for (let [i, item] of Object.entries(data)) {
      await fetchOpenOrder(item.account, item.symbol, item.id )
    }
  } catch (err) { console.log(err)}
}

// 1.4
const fetchOpenOrder = async function(accountId, symbol, id, _id='') {
  try {
    var ccxtId = getCCXTId(accountId, 'safe')
    var rateLimit = global.CCXT[ccxtId]['rateLimit']
    await catchHead(rateLimit, ccxtId)
    try {
      var data = await global.CCXT[ccxtId].fetchOrder(id, symbol)
      if (data.status === 'canceled' || data.status === 'closed') {
        await global.MONGO.collection('openOrders').deleteOne({'account': accountId, 'symbol': symbol, 'id': id})
      } else {
        var res = {
          'account': accountId,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'account': accountId, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    } catch (err) {
      console.log(err)
    }
  } catch (err) { console.log(err)}
}



// API 2.1 Forse fetch this stock/market for active orders
const marketOpenOrders = async function(accountId, symbol) {
  try {
    // console.log('before rate limit')
    var ccxtId = getCCXTId(accountId, 'safe')
    var rateLimit = global.CCXT[ccxtId]['rateLimit']
    await catchHead(rateLimit, ccxtId)
    var stockActiveTrades = await global.CCXT[ccxtId].fetchOpenOrders(symbol = symbol, since = undefined, limit = undefined)
    // console.log('stockActiveTrades')
    // console.log(stockActiveTrades)

    if (stockActiveTrades.length > 0) {
      for (var data of stockActiveTrades) {
        // console.log('stockActiveTrade', data)
        var res = {
          'account': accountId,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'account': accountId, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    }
  } catch (err) { console.log(err) }
}


// 2 for API
const getOpenOrders = async function(accountId, symbol) {
  // отдаем фронту что есть в базе, и форсим проверку на бирже. при следующем запросе с фронта будут обновленные данные
  try {
    var data = await global.MONGO.collection('openOrders').find({'account': accountId, 'symbol': symbol}).toArray()
    marketOpenOrders(accountId, symbol)
    return data
  } catch (err) {
    console.log(err)
  }
}
exports.openOrders = openOrders
exports.fetchOpenOrder = fetchOpenOrder
exports.getOpenOrders = getOpenOrders
