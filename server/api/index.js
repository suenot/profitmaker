const _ = require('lodash')
const express = require('express')
const serializeError = require('serialize-error')
var balanceHistory = require('../core_components/balanceHistory')
// var updateOpenOrders = require('./core_components/updateOpenOrders')
var {getOpenOrders} = require('../core_components/openOrders')
var {getStocks} = require('../core_components/getStocks')
var {getPairs} = require('../core_components/getPairs')
var {getOrderBook} = require('../core_components/getOrderBook')
var {getOHLCV} = require('../core_components/getOHLCV')
var {getTrades} = require('../core_components/updateTradesRaw')
var getMyTrades = require('../core_components/getMyTrades')
var createOrder = require('../core_components/createOrder')
var cancelOrder = require('../core_components/cancelOrder')
var widgets = require('../core_components/widgets')
var {fetchDeposit} = require('../core_components/fetchDeposit')

var router = express.Router()

router.get('/', (req, res) => {
  res.json('https://github.com/kupi-network/kupi-terminal')
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

router.get('/balance/now/:stock', function (req, res) {
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

router.get('/balance/history/:stock/', async function (req, res) {
  try {
    var stock = req.params.stock
    var result = await balanceHistory(stock)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/openOrders/:stock/:pair', async function (req, res) {
  try {
    var stock = req.params.stock
    var symbol = req.params.pair.split('_').join('/')
    var data = await getOpenOrders(stock, symbol)
    res.json(data)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/myTrades/:stock/:pair', function (req, res) {
  try {
    var stock = req.params.stock
    var pair = req.params.pair.split('_').join('/')
    res.json(global.TRADESHISTORY[stock][pair])
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/myTrade/:stock/:pair', async function (req, res) {
  try {
    var stock = req.params.stock.toLowerCase()
    var pair = req.params.pair.split('_').join('/')
    var result = await getMyTrades(stock, pair)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/cancelOrder', async function(req, res) {
  try {
    var result = await cancelOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.post('/createOrder', async function(req, res) {
  try {
    var result = await createOrder(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/trades/:stock/:pair', async function (req, res) {
  try {
    var {stock, pair} = req.params
    var trades = await getTrades(stock, pair)
    res.json(trades)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/stocks', async function (req, res) {
  try {
    var stocks = await getStocks()
    res.json(stocks)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/pairs/:stock', async function (req, res) {
  try {
    var stock = req.params.stock
    var pairs = await getPairs(stock)
    res.json(pairs)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/orders/:stock/:pair', async function (req, res) {
  try {
    var {stock, pair} = req.params
    var orders = await getOrderBook(stock, pair)
    res.json(orders)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/ohlcv/:stock/:pair', async function (req, res) {
  try {
    var {stock, pair} = req.params
    var ohlcv = await getOHLCV(stock, pair)
    res.json(ohlcv)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/fetchDeposit', async function (req, res) {
  try {
    var {stock, symbol} = req.params
    var depositInfo = await fetchDeposit(stock, symbol)
    res.json(depositInfo)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})
module.exports = router
