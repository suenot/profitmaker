
const express = require('express')
const app = express()
const api = require('./api')



const serializeError = require('serialize-error')
const privateKeys = require('../private/keys.json')

const ccxt = require ('ccxt')

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const cookieSession = require('cookie-session')

// PASSPORT
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
// const publicRoot = '../react-client/public/'
// app.use(express.static(publicRoot))
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  (username, password, done) => {
    let user = global.USERS.find((user) => {
      return user.email === username && user.password === password
    })
    if (user) {
      done(null, user)
    } else {
      done(null, false, {message: 'Incorrect username or password'})
    }
  }
))
passport.serializeUser((user, done) => {
  done(null, user.id)
})
passport.deserializeUser((id, done) => {
  let user = global.USERS.find((user) => {
    return user.id === id
  })
  done(null, user)
})
app.use(cookieSession({
  name: 'mysession',
  keys: ['authrandomkey'],
  maxAge: 24 * 60 * 60 * 1000 // 24 hours
}))
app.use(passport.initialize())
app.use(passport.session())
try {
  global.USERS = require('../private/auth.json')
} catch(err) {
  global.USERS = []
}
console.log(global.USERS)


// const localMongoUrl = "mongodb://192.168.99.100:27017/client"
const cors = require('cors')
app.use(cors())

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
