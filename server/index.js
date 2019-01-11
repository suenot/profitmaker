
const express = require('express')
const app = express()
const api = require('./api')



var bodyParser = require('body-parser')
const serializeError = require('serialize-error')
const privateKeys = require('../private/keys.json').keys
const ethPockets = require('../private/keys.json').ethPockets

const ccxt = require ('ccxt')
app.use(bodyParser.json())

// const localMongoUrl = "mongodb://192.168.99.100:27017/client"
const cors = require('cors')
app.use(cors())

const signale = require('signale')


let db


///////////////
//globals start
///////////////
global.MONGO
global.COINMARKETCAP = {}
global.BALANCE = {}
global.STOCKS
global.MARKETS
global.sleepUntil = {}
global.sleepUntilPriority = {}
global.TRADESHISTORY
global.OPENORDERS
global.PAIRS
global.ORDERBOOK
global.OHLCV
global.TRADESRAW

///////////////
//globals end
///////////////
var startMongo = require('./core_components/startMongo')
var updateBalance = require('./core_components/updateBalance')
var initStocks = require('./core_components/initStocks')
var initBalance = require('./core_components/initBalance')
var updateCoinmarketcap = require('./core_components/updateCoinmarketcap')
var updateTradesHistory = require('./core_components/updateTradesHistory')
var balanceHistory = require('./core_components/balanceHistory')
// var updateOpenOrders = require('./core_components/updateOpenOrders')
var {openOrders, fetchOpenOrder, getOpenOrders} = require('./core_components/openOrders')
var {getStocksCycle, getStocks} = require('./core_components/getStocks')
var {getPairs} = require('./core_components/getPairs')
var {getOrderBook} = require('./core_components/getOrderBook')
var {getOHLCV} = require('./core_components/getOHLCV')
var {updateTradesRaw, getTrades} = require('./core_components/updateTradesRaw')
var {getMyTrades} = require('./core_components/getMyTrades')
var {createOrder} = require('./core_components/createOrder')
var {cancelOrder} = require('./core_components/cancelOrder')

const main = async () => {
  try { global.MONGO = await startMongo() } catch(err) { console.log(err) }
  try {

    await initStocks(privateKeys)
    await initBalance()
    // получение публичных данных с сервера
    try { updateCoinmarketcap(60000) } catch(err) { console.log(err) }

    // // получение приватных данных с бирж
    try { updateBalance(privateKeys, ethPockets, 20*60*1000) } catch(err) { console.log(err) }
    // try { updateTradesHistory(localMongo, privateKeys, 60000) } catch(err) { console.log(err) }
    try { openOrders() } catch(err) { console.log(err) }
    // // try { updateOpenOrders(localMongo, privateKeys, 20000) } catch(err) { console.log(err) }
    app.use('/', api)
    try {
      const userApi = require('./user_components/api')
      app.use('/user_components', userApi)
    } catch(err) { console.log(err) }
    try {
      var userComponents = require('./user_components')
      userComponents()
    } catch(err) { console.log(err) }


  } catch (err) { }
}
main()

var port = process.env.DOCKER === 'DOCKER' ? '0.0.0.0' : '127.0.0.1'
app.listen(8051, port, () => {
  console.log('KUPI termintal launched on 8051 port')
})
