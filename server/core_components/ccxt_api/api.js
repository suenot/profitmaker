const express = require('express')
const _ = require('lodash')
const serializeError = require('serialize-error')
var {getPairs} = require('./getPairs')
var {getExchangeOrderBook} = require('./getExchangeOrderBook')
var {getOHLCV} = require('./getOHLCV')
var {getExchangeTrades} = require('./getExchangeTrades')
var {getStocks} = require('./getStocks')

module.exports = () => {
  let app = express()

  app.get(`/:stocks/`, async function (req, res) {
    try {
      res.json(await getStocks())
    } catch(err) {
      res.status(500).send({error: serializeError(err).message})
    }
  })

  app.get(`/:stock/pairs/`, async function (req, res) {
    try {
      var {stock} = req.params
      res.json(await getPairs(stock))
    } catch(err) {
      res.status(500).send({error: serializeError(err).message})
    }
  })

  app.get(`/:stock/orders/:pair`, async function (req, res) {
    try {
      var {stock, pair} = req.params
      stock = stock.toLowerCase()
      symbol = pair.split('_').join('/')
      res.json(await getExchangeOrderBook(stock, pair))
    } catch(err) {
      res.status(500).send({error: serializeError(err).message})
    }
  })

  app.get(`/:stock/candles/:pair/:timeframe`, async function (req, res) {
    try {
      var {stock, pair, timeframe} = req.params
      res.json(await getOHLCV(stock, pair, timeframe))
    } catch(err) {
      res.status(500).send({error: serializeError(err).message})
    }
  })

  app.get(`/:stock/trades/:pair`, async function (req, res) {
    try {
      var {stock, pair} = req.params
      stock = stock.toLowerCase()
      symbol = pair.split('_').join('/')
      res.json(await getExchangeTrades(stock, symbol))
    } catch(err) {
      res.status(500).send({error: serializeError(err).message})
    }
  })

  return app
}
