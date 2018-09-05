const express = require('express')
const app = express()
var bodyParser = require('body-parser')
const serializeError = require('serialize-error')
const privateKeys = require('../private/keys.json').keys
const ethPockets = require('../private/keys.json').ethPockets

const ccxt = require ('ccxt')
app.use(bodyParser.json())

// const localMongoUrl = "mongodb://192.168.99.100:27017/client"
const cors = require('cors')
app.use(cors())



let db
let localMongo

///////////////
//globals start
///////////////
global.COINMARKETCAP
global.BALANCE
global.STOCKS
global.MARKETS
global.sleepUntil = {}
global.sleepUntilPriority = {}
global.TRADESHISTORY
global.OPENORDERS
global.PAIRS
global.ORDERBOOK
global.OHLCV
global.TRADESRAW

///////////////
//globals end
///////////////
var startMongo = require('./core_components/startMongo')
var updateBalance = require('./core_components/updateBalance')
var initStocks = require('./core_components/initStocks')
var updateCoinmarketcap = require('./core_components/updateCoinmarketcap')
var updateTradesHistory = require('./core_components/updateTradesHistory')
var updateOpenOrders = require('./core_components/updateOpenOrders')
var {updateMarkets, getStocks} = require('./core_components/updateMarkets')
var {updatePairs, getPairs} = require('./core_components/updatePairs')
var {updateOrderbook, getOrderBook} = require('./core_components/updateOrderbook')
var {updateOHLCV, getOHLCV} = require('./core_components/updateOHLCV')
var {updateTradesRaw, getTrades} = require('./core_components/updateTradesRaw')

var createOrder = require('./core_components/createOrder')

const main = async () => {
	try { var localMongo = await startMongo() } catch(err) { console.log(err) }
	try {

		await initStocks(privateKeys)
		// получение публичных данных с сервера
		try { updateCoinmarketcap(30000) } catch(err) { console.log(err) } // Ведро - нужно для ссхт апи
		// try { updateMarkets(10000) } catch(err) { console.log(err) } - // Ведро - нужно для фронта - просто убрать цикл
		// try { updatePairs(10000) } catch(err) { console.log(err) }
		// try { updateOrderbook(10000) } catch(err) { console.log(err) }
		// try { updateOHLCV(10000) } catch(err) { console.log(err) }
		// try { updateTradesRaw(10000) } catch(err) { console.log(err) }

		// получение приватных данных с бирж
		try { updateBalance(localMongo, privateKeys, ethPockets, 30000) } catch(err) { console.log(err) }
		try { updateTradesHistory(localMongo, privateKeys, 30000) } catch(err) { console.log(err) }
		try { updateOpenOrders(localMongo, privateKeys, 20000) } catch(err) { console.log(err) }

		//
		// balance (pie chart)
		app.get('/balance', function (req, res) {
			res.json(global.BALANCE)
		})
		app.get('/openOrders/:stock/:pair', function (req, res) {
			try {
				var stock = req.params.stock
				var pair = req.params.pair.split('_').join('/')
				res.json(global.OPENORDERS[stock][pair])
			} catch (err) {
				res.status(500).send({ error: 'openOrders get ' + stock + ' ' + pair + ' failed!' })
				console.log('openOrders ERROR', err)
			}
		})
		app.get('/myTrades/:stock/:pair', function (req, res) {
			try {
				var stock = req.params.stock
				var pair = req.params.pair.split('_').join('/')
				res.json(global.TRADESHISTORY[stock][pair])
			} catch (err) {
				res.status(500).send({ error: 'myTrades get ' + stock + ' ' + pair + ' failed!' })
				console.log('myTrades ERROR', err)
			}

		})

		app.post('/createOrder', async function(req, res) {
			try {

				var result = await createOrder(req.body)

				res.json(result)
			} catch (err) {
				console.log('trade error')
				var errorS = serializeError(err).message
				console.log(errorS)
				res.status(500).send({error: errorS})
			}
		})

		app.get('/trades/:stock/:pair', async function (req, res) {
			try {
				var stock = req.params.stock
				var pair = req.params.pair
				var trades = await getTrades(stock, pair)
				res.json(trades)
				// res.json(global.TRADESRAW[stock][pair])
			} catch (err) {
				res.status(500).send({ error: 'function getTrades get ' + stock + ' ' + pair + ' failed!' })
				console.log('getTrades ERROR', err)
			}
		})

		app.get('/stocks', async function (req, res) {
			try {
				var stocks = await getStocks()
				res.json(stocks)
			} catch (err) {
				res.status(500).send({ error: 'function getStocks failed!' })
				console.log('getStocks ERROR', err)
			}
		})

		app.get('/pairs/:stock', async function (req, res) {
			try {
				var stock = req.params.stock
				var pairs = await getPairs(stock)
				res.json(pairs)
			} catch (err) {
				res.status(500).send({ error: 'function getPairs get ' + stock + ' failed!' })
				console.log('getPairs ERROR', err)
			}
		})
		app.get('/orders/:stock/:pair', async function (req, res) {
			try {
				var stock = req.params.stock
				var pair = req.params.pair
				var orders = await getOrderBook(stock, pair)
				res.json(orders)
			} catch (err) {
				res.status(500).send({ error: 'function getOrderBook get ' + stock + ' ' + pair + ' failed!' })
				console.log('getOrderBook ERROR', err)
			}
    })

		app.get('/ohlcv/:stock/:pair', async function (req, res) {
			try {
				var stock = req.params.stock
				var pair = req.params.pair

				var ohlcv = await getOHLCV(stock, pair)
				// console.log(ohlcv)
				res.json(ohlcv)
			} catch (err) {
				res.status(500).send({ error: 'function getOHLCV get ' + stock + ' ' + pair + ' failed!' })
				console.log('getOHLCV ERROR', err)
			}
		})

	} catch (err) { }
}
main()

app.listen(8051, '0.0.0.0', () => {
	console.log('KUPI termintal launched on 8051 port')
})
