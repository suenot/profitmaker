const _ = require('lodash')
const express = require('express')
const serializeError = require('serialize-error')

var {getPairs} = require('../core_components/kupi_api/getPairs')
var {getOrderBook} = require('../core_components/kupi_api/getOrderBook')
var {getOHLCV} = require('../core_components/kupi_api/getOHLCV')
var {getTrades} = require('../core_components/kupi_api/getTrades')


var balanceHistory = require('../core_components/balanceHistory')
// var updateOpenOrders = require('./core_components/updateOpenOrders')
var {getOpenOrders} = require('../core_components/openOrders')
var {getStocks} = require('../core_components/kupi_api/getStocks')

var {getMyTradesFromVariable} = require('../core_components/getMyTrades')
var createOrder = require('../core_components/createOrder')
var cancelOrder = require('../core_components/cancelOrder')
var widgets = require('../core_components/widgets')
var {fetchDeposit} = require('../core_components/fetchDeposit')

const passport = require('passport')
var router = express.Router()

const authMiddleware = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).send('You are not authenticated')
  } else {
    return next()
  }
}

router.get('/', (req, res) => {
  res.json('https://github.com/kupi-network/kupi-terminal')
})

router.get('/test', (req, res) => {
  res.json('https://github.com/kupi-network/kupi-terminal')
})

router.get('/user-api/widgets/:framework', function (req, res) {
  try {
    if (req.params.framework === 'react') {
      res.json(widgets('react-client'))
    } else if (req.params.framework === 'vue') {
      res.json(widgets('vue-client'))
    } else {
      res.status(500).send({ error: 'wrong framework name' })
    }
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/balance/now/:stock', authMiddleware, function (req, res) {
  try {
    var stock = req.params.stock
    var balance = global.BALANCE[stock]
    balance.data = _.toArray(balance.data)
    balance.data = _.orderBy(balance.data, ['totalUSD'], ['desc'])
    res.json(balance)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/balance/history/:stock/', authMiddleware, async function (req, res) {
  try {
    var stock = req.params.stock
    var result = await balanceHistory(stock)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/openOrders/:account/:pair', authMiddleware, async function (req, res) {
  try {
    var account = req.params.account
    var symbol = req.params.pair.split('_').join('/')
    var data = await getOpenOrders(account, symbol)
    res.json(data)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/myTrades/:accountId/:pair', authMiddleware, async function (req, res) {
  try {
    var accountId = req.params.accountId
    var pair = req.params.pair.split('_').join('/')
    var result = await getMyTradesFromVariable(accountId, pair)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/user-api/cancelOrder', authMiddleware, async function(req, res) {
  try {
    var result = await cancelOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/user-api/createOrder', authMiddleware, async function(req, res) {
  try {
    var result = await createOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

// deprecated
// router.get('/trades/:stock/:pair', async function (req, res) {
//   try {
//     var {stock, pair} = req.params
//     var trades = await getTrades(stock, pair)
//     res.json(trades)
//   } catch (err) {
//     res.status(500).send({error: serializeError(err).message})
//   }
// })

router.get('/user-api/stocks', async function (req, res) {
  try {
    var stocks = await getStocks()
    res.json(stocks)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/pairs/:stock', async function (req, res) {
  try {
    var stock = req.params.stock
    var pairs = await getPairs(stock)
    res.json(pairs)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/orders/:stock/:pair', async function (req, res) {
  try {
    var {stock, pair} = req.params
    var orders = await getOrderBook(stock, pair)
    res.json(orders)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/user-api/ohlcv/:stock/:pair', async function (req, res) {
  try {
    var {stock, pair} = req.params
    var ohlcv = await getOHLCV(stock, pair)
    res.json(ohlcv)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

// TODO danger key only
router.get('/user-api/fetchDeposit', authMiddleware, async function (req, res) {
  try {
    var {stock, symbol} = req.params
    var depositInfo = await fetchDeposit(stock, symbol)
    res.json(depositInfo)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})
//
router.get('/user-api/accounts', authMiddleware, function (req, res) {
  try {
    res.json(global.ACCOUNTS)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post("/user-api/login", (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err)
    }
    if (!user) {
      return res.status(400).send([user, "Cannot log in", info])
    }
    req.login(user, (err) => {
      res.send("Logged in")
    })
  })(req, res, next)
})

router.get('/user-api/logout', authMiddleware, function(req, res){
  req.logout()
  console.log("logged out")
  return res.send()
})

router.get("/user-api/user", authMiddleware, (req, res) => {
  let user = global.USERS.find((user) => {
    return user.id === req.session.passport.user
  })
  console.log([user, req.session])
  res.send({user: user})
})

module.exports = router
