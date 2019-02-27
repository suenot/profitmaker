
const express = require('express')
const app = express()
const api = require('./api')



var bodyParser = require('body-parser')
const serializeError = require('serialize-error')
const privateKeys = require('../private/keys.json')

const ccxt = require ('ccxt')
app.use(bodyParser.json())

// const localMongoUrl = "mongodb://192.168.99.100:27017/client"
const cors = require('cors')
app.use(cors())

const signale = require('signale')

// deprecated ?
let db


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
var {checkCcxt} = require('./core_components/checkCcxt')


var names = ['binance', 'tidex']

const main = async () => {
  try { global.MONGO = await startMongo() } catch(err) { console.log(err) }
  try {

    await initCCXT(privateKeys)
    await initEthplorer(privateKeys)
    // console.log(global.ACCOUNTS)
    // console.log(global.CCXT)

    checkCcxt(names)

    await initBalance()
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


    // // try { await fetchDeposit('binance', 'ETH') } catch(err) { console.log(err) }


    app.use('/', api)
    // try {
    //   const userApi = require('./user_components/api')
    //   app.use('/user_components', userApi)
    // } catch(err) { console.log(err) }
    // try {
    //   var userComponents = require('./user_components')
    //   userComponents()
    // } catch(err) { console.log(err) }


  } catch (err) { }
}
main()

var port = process.env.DOCKER === 'DOCKER' ? '0.0.0.0' : '127.0.0.1'
app.listen(8040, port, () => {
  console.log('KUPI termintal launched on 8040 port')
})
