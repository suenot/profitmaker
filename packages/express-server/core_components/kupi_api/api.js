const express = require('express')
const _ = require('lodash')
const serializeError = require('serialize-error')
var {getPairs} = require('./getPairs')
var {getOrderBook} = require('./getOrderBook')
var {getOHLCV} = require('./getOHLCV')
var {getTrades} = require('./getTrades')

var router = express.Router({mergeParams: true})

router.get('/', (req, res) => {
  res.json('kupi api')
})

router.get('/stocks', function (req, res) {
  try {
    res.json(getStocks())
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/:stock/pairs/', function (req, res) {
  try {
    var {stock} = req.params
    res.json(getPairs(stock))
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/:stock/orders/:pair', function (req, res) {
  try {
    var {stock, pair} = req.params
    var orders = getOrderBook(stock, pair)
    res.json(orders)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/:stock/candles/:pair/:timeframe', function (req, res) {
  try {
    var {stock, pair} = req.params
    var ohlcv = getOHLCV(stock, pair)
    res.json(ohlcv)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get('/:stock/trades/:pair', function (req, res) {
  try {
    var {stock, pair} = req.params
    var data = getTrades(stock, pair)
    // data.splice(0, 100)
    // data = _.reverse(data)
    res.json(data)
  } catch (err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

module.exports = router
