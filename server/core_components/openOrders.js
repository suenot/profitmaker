var {sleep, catchHead} = require('../../utils')
const ccxt = require ('ccxt')
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
const fetchOpenOrder = async function(account, symbol, id, _id='') {
  try {
    try {
      var ccxtID = global.ACCOUNTS[account].notSafe
    } catch (err) {
      return 'need notSafe key for openOrders'
    }
    var rateLimit = global.CCXT[ccxtID]['rateLimit']
    await catchHead(rateLimit, ccxtID)
    try {
      var data = await global.CCXT[ccxtID].fetchOrder(id, symbol)
      if (data.status === 'canceled' || data.status === 'closed') {
        // console.log('не найдено ордеров, удаляем коллекцию ' + stockName + ':'+ symbol + ':'+_id)
        await global.MONGO.collection('openOrders').deleteOne({'account': account, 'symbol': symbol, 'id': id})
      } else {
        // console.log('найдены ордера, проверяем коллекцию ' + stockName + ':'+ symbol + ':'+id)
        var res = {
          'account': account,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'account': account, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    } catch (err) {
      console.log(err)
    }
  } catch (err) { console.log(err)}
}



// API 2.1 Forse fetch this stock/market for active orders
const marketOpenOrders = async function(account, symbol) {
  try {
    try {
      var ccxtID = global.ACCOUNTS[account].notSafe
    } catch (err) {
      return 'need notSafe key for openOrders'
    }

    var rateLimit = global.CCXT[ccxtID]['rateLimit']
    await catchHead(rateLimit, ccxtID)
    var stockActiveTrades = await global.CCXT[ccxtID].fetchOpenOrders(symbol = symbol, since = undefined, limit = undefined)

    if (stockActiveTrades.length > 0) {
      for (var data of stockActiveTrades) {
        // console.log('stockActiveTrade', data)
        var res = {
          'account': account,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'account': account, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    }
  } catch (err) { console.log(err) }
}


// 2 for API
const getOpenOrders = async function(account, symbol) {
  // отдаем фронту что есть в базе, и форсим проверку на бирже. при следующем запросе с фронта будут обновленные данные
  try {
    var data = await global.MONGO.collection('openOrders').find({'account': account, 'symbol': symbol}).toArray()
    marketOpenOrders(account, symbol)
    return data
  } catch (err) {}
}
exports.openOrders = openOrders
exports.fetchOpenOrder = fetchOpenOrder
exports.getOpenOrders = getOpenOrders
