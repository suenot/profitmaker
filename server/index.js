const express = require('express')
const app = express()
const api = require('./api/api')
// const authApi = require('./core_components/auth/api')
// const ccxtApi = require('./core_components/ccxt_api/api')
// const kupiApi = require('./core_components/kupi_api/api')



// const serializeError = require('serialize-error')
const privateKeys = require('../private/keys.json')


const bodyParser = require('body-parser')
app.use(bodyParser.json())


// PASSPORT
var {auth} = require('./core_components/auth/auth')
auth(app)


// const localMongoUrl = "mongodb://192.168.99.100:27017/client"
const cors = require('cors')
app.use(cors())

// deprecated ?
// let db


///////////////
//globals start
///////////////
global.MONGO
global.COINMARKETCAP = {}
global.BALANCE = {}
// global.STOCKS = {}
global.CCXT = {}
global.ACCOUNTS = {}
global.ETHPLORER = {}
global.MARKETS
global.sleepUntil = {}
global.sleepUntilPriority = {}
global.OPENORDERS
global.PAIRS = {}
global.ORDERBOOK
global.OHLCV
global.TRADESRAW
global.MYTRADES = {}

//////////////
// globals end
//////////////
var startMongo = require('./core_components/startMongo')
var {updateBalance} = require('./core_components/updateBalance')
var {initCCXT} = require('./core_components/initCCXT')
var {initEthplorer} = require('./core_components/initEthplorer')
var initBalance = require('./core_components/initBalance')
var {updateCoinmarketcapCycle, updateCoinmarketcap} = require('./core_components/kupi_api/updateCoinmarketcap')
var balanceHistory = require('./core_components/balanceHistory')
var {openOrders, fetchOpenOrder, getOpenOrders} = require('./core_components/openOrders')
var {getStocksCycle, getStocks} = require('./core_components/kupi_api/getStocks')
var {getPairs} = require('./core_components/kupi_api/getPairs')
var {getOrderBook} = require('./core_components/kupi_api/getOrderBook')
var {getOHLCV} = require('./core_components/kupi_api/getOHLCV')
var {getTrades} = require('./core_components/kupi_api/getTrades')
var {getMyTrades} = require('./core_components/getMyTrades')
var {createOrder} = require('./core_components/createOrder')
var {cancelOrder} = require('./core_components/cancelOrder')


var {getExchangeTrades} = require('./core_components/ccxt_api/getExchangeTrades')
var {getExchangeOrderBook} = require('./core_components/ccxt_api/getExchangeOrderBook')
var {getExchangeOHLCV} = require('./core_components/ccxt_api/getExchangeOHLCV')





const main = async () => {
  try { global.MONGO = await startMongo() } catch(err) { console.log(err) }
  try {

    try {
      await initCCXT(privateKeys)
      await initEthplorer(privateKeys)
    } catch(err) {
      console.log('No keys, no problems')
    }
    // console.log(global.ACCOUNTS)
    // console.log(global.CCXT)
    // getExchangeTrades('binance', 'ETH/BTC')
    // getExchangeOrderBook('binance', 'ETH/BTC')
    getExchangeOHLCV('binance', 'ETH/BTC', '1m')

    try { await initBalance() } catch(err) { console.log(err) }
    // получение публичных данных с сервера
    try { await updateCoinmarketcap() } catch(err) { console.log(err) }
    // try { updateCoinmarketcapCycle(60000) } catch(err) { console.log(err) }

    // // получение приватных данных с бирж

    // SAFE
    // balance


    try { updateBalance(20*60*1000) } catch(err) { console.log(err) }


    // console.log(await getMyTrades('ID_Binance_2', 'ETH/BTC') )  // тестовое получение трэйдов

    // KUPI_API | SAFE & PUBLIC
    // console.log(await getPairs('binance'))
    // console.log(await getTrades('binance', 'ETH_BTC'))
    // console.log(await getStocks())
    // console.log(await updateCoinmarketcap())
    // console.log(await getOrderBook('binance', 'ETH_BTC'))
    // console.log(await getOHLCV('binance', 'ETH_BTC', '3m'))


    // NOT-SAFE
    try { openOrders(90000) } catch(err) { console.log(err) }


    // try { await fetchDeposit('binance', 'ETH') } catch(err) { console.log(err) }


    app.use('/user-api/', api)
    // app.use('/user-api/auth/', authApi)
    // app.use('/user-api/ccxt/', ccxtApi)
    // app.use('/user-api/kupi/', kupiApi)
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
app.listen(8040, port, () => {
  console.log('KUPI termintal launched on 8040 port')
})
