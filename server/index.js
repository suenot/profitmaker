const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var MongoClient = require('mongodb').MongoClient
const privateKeys = require('../private/keys.json').keys
const ethPockets = require('../private/keys.json').ethPockets
// const mongoConf = require('../private/mongo.json').mongo
const ccxt = require ('ccxt')
app.use(bodyParser.json())
const localMongoUrl = "mongodb://192.168.99.100:27017/client"
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

var updateBalance = require('./core_components/updateBalance')
var initStocks = require('./core_components/initStocks')
var updateCoinmarketcap = require('./core_components/updateCoinmarketcap')
var updateTradesHistory = require('./core_components/updateTradesHistory')
var updateOpenOrders = require('./core_components/updateOpenOrders')
var updateMarkets = require('./core_components/updateMarkets')
var updatePairs = require('./core_components/updatePairs')
var updateOrderbook = require('./core_components/updateOrderbook')
var updateOHLCV = require('./core_components/updateOHLCV')
var updateTradesRaw = require('./core_components/updateTradesRaw')

const main = async () => {
	try {
		localMongo = await MongoClient.connect(localMongoUrl)

		await initStocks(privateKeys)
		// получение публичных данных с сервера
		try { updateCoinmarketcap(10000) } catch(err) { console.log(err) } // TODO бюрать с сервера
		try { updateMarkets(10000) } catch(err) { console.log(err) }
		try { updatePairs(10000) } catch(err) { console.log(err) }
		try { updateOrderbook(10000) } catch(err) { console.log(err) }
		try { updateOHLCV(10000) } catch(err) { console.log(err) }
		try { updateTradesRaw(10000) } catch(err) { console.log(err) }

		// получение приватных данных с бирж
		try { updateBalance(localMongo, privateKeys, ethPockets, 30000) } catch(err) { console.log(err) }
		try { updateTradesHistory(localMongo, privateKeys, 30000) } catch(err) { console.log(err) }
		try { updateOpenOrders(localMongo, privateKeys, 10000) } catch(err) { console.log(err) }

		//
		// balance (pie chart)
		app.get('/balance', function (req, res) {
			res.json(global.BALANCE)
		})

		app.get('/openOrders', function (req, res) {
			res.json(global.OPENORDERS)

		})

		app.get('/myTrades', function (req, res) {
			res.json(global.TRADESHISTORY)
		})

		app.get('/trades/:stock/:pair', function (req, res) {
			var stock = req.params.stock
      var pair = req.params.pair.split('_').join('/')
			res.json(global.TRADESRAW[stock][pair])
		})

		app.get('/stocks', function (req, res) {
			res.json(global.MARKETS)
		})

		app.get('/pairs/:stock', function (req, res) {
        var stock = req.params.stock
        res.json(global.PAIRS[stock])
    })

		app.get('/orders/:stock/:pair', function (req, res) {
	    var stock = req.params.stock
	    var pair = req.params.pair.split('_').join('/')
	    res.json(global.ORDERBOOK[stock][pair])
    })

		app.get('/ohlcv/:stock/:pair', function (req, res) {
      var stock = req.params.stock
      var pair = req.params.pair.split('_').join('/')
      res.json(global.OHLCV[stock][pair])
    })

	} catch (err) { }
}
main()

app.listen(8051, '0.0.0.0', () => {
	console.log('KUPI termintal launched on 8051 port')
})
