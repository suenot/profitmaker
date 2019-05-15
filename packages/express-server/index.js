const express = require('express')
const app = express()
const api = require('./api/api')

// GET PRIVATE CONFIGS
var fs = require('fs')
try {
  var privateKeys = JSON.parse(fs.readFileSync('../../private/keys.json', 'utf8'))
} catch(err) {
  var privateKeys = []
}

// END GET PRIVATE CONFIGS

const bodyParser = require('body-parser')
app.use(bodyParser.json())


// PASSPORT
var {auth} = require('./core_components/auth/auth')
auth(app)


const cors = require('cors')
app.use(cors())


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
global.ORDERBOOK = {}
global.OHLCV = {}
global.TRADESRAW
global.TRADES = {}
global.MYTRADES = {}

//////////////
// globals end
//////////////
var startMongo = require('./core_components/startMongo')
var {updateBalance} = require('./core_components/updateBalance')
var {initCCXT} = require('./core_components/initCCXT')
var {initEthplorer} = require('./core_components/initEthplorer')
var initBalance = require('./core_components/initBalance')
var {updateCoinmarketcap} = require('./core_components/kupi_api/updateCoinmarketcap')
var {openOrders} = require('./core_components/openOrders')


const ccxt = require ('ccxt')


const main = async () => {
  try { global.MONGO = await startMongo() } catch(err) { console.log(err) }
  try {

    try {
      // console.log(privateKeys)
      await initCCXT(privateKeys)
    } catch(err) {
      console.log(err)
      console.log('No ccxt keys, no problems')
    }
    try {
      await initEthplorer(privateKeys)
    } catch(err) {
      console.log('No ethplorer keys, no problems')
    }

    if (global.MONGO) {
      try { await initBalance() } catch(err) { console.log(err) }
      // получение публичных данных с сервера
      try { await updateCoinmarketcap() } catch(err) { console.log(err) }
      // try { updateCoinmarketcapCycle(60000) } catch(err) { console.log(err) }
      try { updateBalance(20*60*1000) } catch(err) { console.log(err) }
      try { openOrders(90000) } catch(err) { console.log(err) }
    }

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

if (process.env.QUEUE_LOG === 'TRUE') {
  setInterval(()=>{
    console.log('queue:')
    console.log(global.sleepUntil)
  }, 1000)
}

var port = process.env.DOCKER === 'DOCKER' ? '0.0.0.0' : '127.0.0.1'
app.listen(8040, port, () => {
  console.log('KUPI termintal launched on 8040 port')
})
