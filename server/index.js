const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var MongoClient = require('mongodb').MongoClient
const privateKeys = require('../private/keys.json').keys
const mongoConf = require('../private/mongo.json').mongo
const ccxt = require ('ccxt')
const url = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.host+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
app.use(bodyParser.json())
const localMongoUrl = "mongodb://192.168.99.100:32768/client"
const cors = require('cors')
app.use(cors())



let db
let localMongo

///////////////
//globals start
///////////////
global.COINMARKETCAP
global.BALANCE

///////////////
//globals end
///////////////

var updateBalance = require('./core_components/updateBalance')
var updateCoinmarketcap = require('./core_components/updateCoinmarketcap')

const main = async () => {
	try {
		db = await MongoClient.connect(url)
		localMongo = await MongoClient.connect(localMongoUrl)

		try { updateBalance(localMongo, privateKeys, 10000) } catch(err) { console.log(err) }
		try { updateCoinmarketcap(db) } catch(err) { console.log(err) }


		// balance (pie chart)
		app.get('/balance', function (req, res) {
			res.json(global.BALANCE)
		})
		// balance_history (linechart)

		// my_traders_short
		// my_traders_all

		// open_orders ()

		// TRADE API
		// place
		// cancel
		// replace
	} catch (err) { }
}
main()

app.listen(8051, '0.0.0.0', () => {
	console.log('KUPI termintal launched on 8051 port')
})
