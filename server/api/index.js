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

var router = express.Router()

router.get('/widgets', function (req, res) {
  try {
    res.json(widgets())
  } catch (err) {
    res.status(500).send({ error: 'fetch widgets' + ' failed!' })
  }
})

router.get('/balance/:stock', function (req, res) {
  try {
    var stock = req.params.stock
    var balance = global.BALANCE[stock]
    balance.data = _.toArray(balance.data)
    balance.data = _.orderBy(balance.data, ['totalUSD'], ['desc'])
    res.json(balance)
  } catch (err) {
    res.status(500).send({ error: 'balance get ' + stock + ' failed!' })
    // console.log('balance ERROR', err)
  }
})

router.get('/balance/history/:stock/', async function (req, res) {
  try {
      var stock = req.params.stock
      var result = await balanceHistory(stock)
      res.json(result)
  } catch (err) {
      res.status(500).send({ error: 'balance history get ' + stock + ' failed!' })
      // console.log('balance history ERROR', err)
  }
})

router.get('/openOrders/:stock/:pair', async function (req, res) {
  try {
      var stock = req.params.stock
      var symbol = req.params.pair.split('_').join('/')
      var data = await getOpenOrders(stock, symbol)
      res.json(data)
  } catch (err) {
      res.status(500).send({ error: 'openOrders get ' + stock + ' ' + pair + ' failed!' })
      // console.log('openOrders ERROR', err)
  }
})

router.get('/myTrades/:stock/:pair', function (req, res) {
  try {
      var stock = req.params.stock
      var pair = req.params.pair.split('_').join('/')
      res.json(global.TRADESHISTORY[stock][pair])
  } catch (err) {
      res.status(500).send({ error: 'myTrades get ' + stock + ' ' + pair + ' failed!' })
      // console.log('myTrades ERROR', err)
  }
})

router.get('/myTrade/:stock/:pair', async function (req, res) {
  try {
      var stock = req.params.stock.toLowerCase()
      var pair = req.params.pair.split('_').join('/')
      var result = await getMyTrades(stock, pair)
      res.json(result)
  } catch (err) {
      res.status(500).send({ error: 'myTrade get ' + stock + ' ' + pair + ' failed!' })
      console.log('myTrades ERROR', err)
  }
})

router.post('/cancelOrder', async function(req, res) {
  try {
      console.log(req.body)
      var result = await cancelOrder(req.body)
      res.json(result)
  } catch (err) {
      var errorS = serializeError(err).message
      // console.log(errorS)
      res.status(500).send({error: errorS})
  }
})

router.post('/createOrder', async function(req, res) {
  try {
      var result = await createOrder(req.body)
      res.json(result)
  } catch (err) {
      console.log('trade error')
      var errorS = serializeError(err).message
      // console.log(errorS)
      res.status(500).send({error: errorS})
  }
})

router.get('/trades/:stock/:pair', async function (req, res) {
  try {
      var stock = req.params.stock
      var pair = req.params.pair
      var trades = await getTrades(stock, pair)
      res.json(trades)
  } catch (err) {
      res.status(500).send({ error: 'function getTrades get ' + stock + ' ' + pair + ' failed!' })
      console.log('getTrades ERROR', err)
  }
})

router.get('/stocks', async function (req, res) {
  try {
      var stocks = await getStocks()
      res.json(stocks)
  } catch (err) {
      res.status(500).send({ error: 'function getStocks failed!' })
      // console.log('getStocks ERROR', err)
  }
})

router.get('/pairs/:stock', async function (req, res) {
  try {
      var stock = req.params.stock
      var pairs = await getPairs(stock)
      res.json(pairs)
  } catch (err) {
      res.status(500).send({ error: 'function getPairs get ' + stock + ' failed!' })
      // console.log('getPairs ERROR', err)
  }
})

router.get('/orders/:stock/:pair', async function (req, res) {
  try {
      var stock = req.params.stock
      var pair = req.params.pair
      var orders = await getOrderBook(stock, pair)
      res.json(orders)
  } catch (err) {
      res.status(500).send({ error: 'function getOrderBook get ' + stock + ' ' + pair + ' failed!' })
      // console.log('getOrderBook ERROR', err)
  }
})

router.get('/ohlcv/:stock/:pair', async function (req, res) {
  try {
      var stock = req.params.stock
      var pair = req.params.pair
      var ohlcv = await getOHLCV(stock, pair)
      res.json(ohlcv)
  } catch (err) {
      res.status(500).send({ error: 'function getOHLCV get ' + stock + ' ' + pair + ' failed!' })
      // console.log('getOHLCV ERROR', err)
  }
})

module.exports = router
