const express = require('express')
const _ = require('lodash')
const serializeError = require('serialize-error')
var {getExchangePairs} = require('./getExchangePairs')
var {getExchangeOrderBook} = require('./getExchangeOrderBook')
var {getExchangeOHLCV} = require('./getExchangeOHLCV')
var {getExchangeTrades} = require('./getExchangeTrades')
var {getStocks} = require('./getStocks')

var router = express.Router({mergeParams: true})

router.get('/', (req, res) => {
  res.json('ccxt api')
})

router.get(`/stocks/`, function (req, res) {
  try {
    res.json(getStocks())
  } catch(err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get(`/:stock/pairs/`, function (req, res) {
  try {
    var {stock} = req.params
    stock = stock.toLowerCase()
    res.json(getExchangePairs(stock))
  } catch(err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get(`/:stock/orders/:pair`, function (req, res) {
  try {
    var {stock, pair} = req.params
    stock = stock.toLowerCase()
    var symbol = pair.split('_').join('/')
    res.json(getExchangeOrderBook(stock, symbol))
  } catch(err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get(`/:stock/candles/:pair/:timeframe`, function (req, res) {
  try {
    var {stock, pair, timeframe} = req.params
    stock = stock.toLowerCase()
    symbol = pair.split('_').join('/')
    res.json(getExchangeOHLCV(stock, symbol, timeframe))
  } catch(err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

router.get(`/:stock/trades/:pair`, function (req, res) {
  try {
    var {stock, pair} = req.params
    stock = stock.toLowerCase()
    var symbol = pair.split('_').join('/')
    res.json(getExchangeTrades(stock, symbol))
  } catch(err) {
    res.status(500).send({error: serializeError(err).message})
  }
})

module.exports = router
