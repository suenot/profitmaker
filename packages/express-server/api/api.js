const _ = require('lodash')
const express = require('express')
const serializeError = require('serialize-error')
var balanceHistory = require('../core_components/balanceHistory')
var {balanceAvailable} = require('../core_components/balanceAvailable')
var {getOpenOrders} = require('../core_components/openOrders')
var {getMyTradesFromVariable} = require('../core_components/getMyTrades')
var createOrder = require('../core_components/createOrder')
var cancelOrder = require('../core_components/cancelOrder')
var widgets = require('../core_components/widgets')
var {fetchDeposit} = require('../core_components/fetchDeposit')
var router = express.Router({mergeParams: true})
const {authMiddleware} = require('../utils/authMiddleware/authMiddleware.js')
const authApi = require('../core_components/auth/api')
const ccxtApi = require('../core_components/ccxt_api/api')
const kupiApi = require('../core_components/kupi_api/api')

router.get('/', (req, res) => {
  res.json('user-api')
})

router.get('/widgets/:framework', function (req, res) {
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

router.get('/balance', async function (req, res) {
  // console.log('/balance')
  // console.log(req.query.stock)
  try {
    var {stock, type, accountId} = req.query
    var key = accountId
    if (stock === 'TOTAL') key = 'TOTAL'

    if (type === 'now') {
      var balance = global.BALANCE[key]
      balance.data = _.toArray(balance.data)
      balance.data = _.orderBy(balance.data, ['totalUSD'], ['desc'])
      res.json(balance)
    } else if (type === 'history') {
      var result = await balanceHistory(stock)
      res.json(result)
    }
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/balance', authMiddleware, async function (req, res) {
  try {
    var {stock, type, accountId} = req.body
    var key = accountId
    if (stock === 'TOTAL') key = 'TOTAL'

    if (type === 'now') {
      var balance = global.BALANCE[key]
      balance.data = _.toArray(balance.data)
      balance.data = _.orderBy(balance.data, ['totalUSD'], ['desc'])
      res.json(balance)
    } else if (type === 'history') {
      var result = await balanceHistory(stock)
      res.json(result)
    }
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/balance/available', authMiddleware, async function (req, res) {
  try {
    var {stock, pair, accountId} = req.body
    var result = balanceAvailable(stock, pair, accountId)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/openOrders/:account/:pair', authMiddleware, async function (req, res) {
  try {
    var account = req.params.account
    var symbol = req.params.pair.split('_').join('/')
    var data = await getOpenOrders(account, symbol)
    res.json(data)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/myTrades/:accountId/:pair', authMiddleware, async function (req, res) {
  try {
    var accountId = req.params.accountId
    var pair = req.params.pair.split('_').join('/')
    var result = await getMyTradesFromVariable(accountId, pair)
    result = _.reverse(result)
    result = result.slice(0, 100)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/cancelOrder', authMiddleware, async function(req, res) {
  try {
    var result = await cancelOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/createOrder', authMiddleware, async function(req, res) {
  try {
    var result = await createOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})
router.get('/fetchDeposit', authMiddleware, async function (req, res) {
  try {
    var {stock, symbol} = req.params
    var depositInfo = await fetchDeposit(stock, symbol)
    res.json(depositInfo)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.use('/auth/', authApi)
router.use('/ccxt/', ccxtApi)
router.use('/kupi/', kupiApi)

module.exports = router
