const ccxt = require ('ccxt')
// var catchHead = require('../../utils').catchHead

var getMyTrades = require('../core_components/getMyTrades')
var {getPairs} = require('../core_components/getPairs')
var {getStocks} = require('../core_components/getStocks')
var {getOrderBook} = require('../core_components/getOrderBook')
var {getOHLCV} = require('../core_components/getOHLCV')

global.PAIRS = {}
global.ORDERBOOK = {}
global.STOCKS = {}
global.sleepUntil = {}

// describe('kupi.net API tests', () => {
//   it('getPairs(ETH/BTC)', async () => {
//     var result = await getPairs('binance')
//     expect(result).toEqual(expect.arrayContaining(['ETH/BTC']))
//   })
//   it('getStocks(binance)', async () => {
//     var result = await getStocks()
//     expect(result['BINANCE']['name']).toEqual('BINANCE')
//   })
//   it('getOrderBook(binance, ETH_BTC) is object', async () => {
//     var result = await getOrderBook('binance', 'ETH_BTC')
//     expect(result).toBeInstanceOf(Object)
//   })
//   it('getOrderBook(binance, ETH_BTC) have asks & bids', async () => {
//     var result = await getOrderBook('binance', 'ETH_BTC')
//     expect(Object.keys(result)).toEqual(
//       expect.arrayContaining([ 'bids', 'asks' ])
//     )
//   })
//   it('getOHLCV(binance, ETH_BTC) is array', async () => {
//     var result = await getOHLCV('binance', 'ETH_BTC')
//     expect(result).toBeInstanceOf(Array)
//   })
// })

// describe('ccxt API tests', () => {
//   it('GetMyTrades(binance, ETH/BTC) is array', async () => {
//     var stockName = 'binance'
//     global.STOCKS[stockName] = new ccxt[stockName] ({
//         'enableRateLimit': true,
//         'apiKey': privateKeys.apiKey,
//         'secret': privateKeys.secret
//     })
//     var result = await getMyTrades(stockName, 'ETH/BTC')
//     expect(result).toBeInstanceOf(Array)
//   })
// })

