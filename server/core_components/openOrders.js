var {sleep, catchHead} = require('../../utils')
const ccxt = require ('ccxt')
const {ObjectId} = require('mongodb')


const openOrders = async function(db) {
  try {
    while (true) {
      var dataToParse = await getOpenOrdersFromDB(db)
      // console.log(dataToParse)
      if (dataToParse != []) {
        await createParseLists(dataToParse, db)
      }
      await sleep(90000)
    }
  } catch (err) { console.log(err)}
}
const getOpenOrdersFromDB = async function(db) {
  try {
    var data = db.collection('openOrders').find({}).toArray()
    if (data.data === []) {
      return {}
    } else { return data }
  } catch (err) { console.log(err)}
}


const createParseLists = async function(data, db) {
  try {
    for (let [i, item] of Object.entries(data)) {
      await fetchOpenOrder(item.stock, item.symbol, db, item.id )
    }
  } catch (err) { console.log(err)}
}


const fetchOpenOrder = async function(stock, symbol, db, id, _id='') {
  try {
    // var log = {
    // 	stock,
    //   symbol,
    //   id,
    //   _id
    // }
    // console.log(log)
    var stockName = stock.toLowerCase()
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    await catchHead(rateLimit, stockName)
    try {
      var data = await global.STOCKS[stockName].fetchOrder(id, symbol)
      if (data.status === 'canceled' || data.status === 'closed') {
        // console.log(data)
        // console.log('не найдено ордеров, удаляем коллекцию ' + stockName + ':'+ symbol + ':'+_id)
        // await db.collection('openOrders').deleteOne({'_id': ObjectId(_id)})
        await db.collection('openOrders').deleteOne({'stock': stock, 'symbol': symbol, 'id': id})
      } else {
        // console.log(data)
        // console.log('найдены ордера, проверяем коллекцию ' + stockName + ':'+ symbol + ':'+id)
        var res = {
          'stock': stock,
          'symbol': symbol,
          'id': data.id,
          'timestamp': Date.now(),
          'datetime': new Date(Date.now()),
          'data': data
        }
        await db.collection('openOrders').replaceOne({'stock': stock, 'symbol': symbol, 'id': data.id}, res, {upsert: true})
      }
    } catch (err) {
      console.log(err)
    }
  } catch (err) { console.log(err)}
}
const getOpenOrders = async function(db, stock, symbol) {
  try {
    return data = await db.collection('openOrders').find({'stock': stock, 'symbol': symbol}).toArray()
  } catch (err) {}
}
exports.openOrders = openOrders
exports.fetchOpenOrder = fetchOpenOrder
exports.getOpenOrders = getOpenOrders
