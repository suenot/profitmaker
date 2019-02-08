var {sleep, catchHead} = require('../../utils')
const ccxt = require ('ccxt')
const {ObjectId} = require('mongodb')
const _ = require ('lodash')

//1
const openOrders = async function() {
  try {
    while (true) {
      var dataToParse = await getOpenOrdersFromDB()
      // console.log(dataToParse)
      if (!_.isEmpty(dataToParse)) {
        await createParseLists(dataToParse)
      }
      await sleep(90000)
    }
  } catch (err) { console.log(err)}
}

const getOpenOrdersFromDB = async function() {
  try {
    var data = global.MONGO.collection('openOrders').find({}).toArray()

    if (_.isEmpty(data.data)) {
      return {}
    } else { return data }
  } catch (err) { console.log(err)}
}


const createParseLists = async function(data) {
  try {
    for (let [i, item] of Object.entries(data)) {
      await fetchOpenOrder(item.stock, item.symbol, item.id )
    }
  } catch (err) { console.log(err)}
}


const fetchOpenOrder = async function(stock, symbol, id, _id='') {
  try {
    var stockName = stock.toLowerCase()
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    await catchHead(rateLimit, stockName)
    try {
      var data = await global.STOCKS[stockName].fetchOrder(id, symbol)
      if (data.status === 'canceled' || data.status === 'closed') {
        // console.log('не найдено ордеров, удаляем коллекцию ' + stockName + ':'+ symbol + ':'+_id)
        await global.MONGO.collection('openOrders').deleteOne({'stock': stock, 'symbol': symbol, 'id': id})
      } else {
        // console.log('найдены ордера, проверяем коллекцию ' + stockName + ':'+ symbol + ':'+id)
        var res = {
          'stock': stock,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'stock': stock, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    } catch (err) {
      console.log(err)
    }
  } catch (err) { console.log(err)}
}


// API step 2. Forse fetch this stock/market for active orders
const marketOpenOrders = async function(stock, symbol) {
  try {
    var stockName = stock.toLowerCase()
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    await catchHead(rateLimit, stockName)
    var stockActiveTrades = await global.STOCKS[stockName].fetchOpenOrders(symbol = symbol, since = undefined, limit = undefined)

    if (stockActiveTrades.length > 0) {
      for (var data of stockActiveTrades) {
        // console.log('stockActiveTrade', data)
        var res = {
          'stock': stock,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await global.MONGO.collection('openOrders').replaceOne({'stock': stock, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    }
  } catch (err) { console.log(err) }
}


// for API
const getOpenOrders = async function(stock, symbol) {
  try {
    var data = await global.MONGO.collection('openOrders').find({'stock': stock, 'symbol': symbol}).toArray()
    marketOpenOrders(stock, symbol)
    return data
  } catch (err) {}
}
exports.openOrders = openOrders
exports.fetchOpenOrder = fetchOpenOrder
exports.getOpenOrders = getOpenOrders
