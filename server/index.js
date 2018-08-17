const express = require('express')
const app = express()
var bodyParser = require('body-parser')
var MongoClient = require('mongodb').MongoClient
const mongoConf = require('./_utils/_private.json').mongo
const url = 'mongodb://'+mongoConf.username+':'+mongoConf.password+'@'+mongoConf.host+':'+mongoConf.port+'/'+mongoConf.db+'?authSource=admin'
app.use(bodyParser.json())
let db

const main = async () => {
  try {
 	db = await MongoClient.connect(url)
    
    // balance (pie chart)
    app.get('/balance', function (req, res) {
		res.json('Хав аюе ду')
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
