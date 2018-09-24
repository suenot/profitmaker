var getMyTrades = require('../core_components/getMyTrades')
var {getPairs} = require('../core_components/getPairs')
var {getStocks} = require('../core_components/getStocks')
var {getOrderBook} = require('../core_components/getOrderBook')

global.PAIRS = {}
global.ORDERBOOK = {}

describe('API tests', () => {
  it('getPairs(ETH/BTC)', async () => {
    var result = await getPairs('binance')
    expect(result).toEqual(expect.arrayContaining(['ETH/BTC']))
  })
  it('getStocks(binance)', async () => {
    var result = await getStocks()
    expect(result['BINANCE']['name']).toEqual('BINANCE')
  })
  it('getOrderBook(binance, ETH_BTC) is object', async () => {
    var result = await getOrderBook('binance', 'ETH_BTC')
    expect(result).toBeInstanceOf(Object)
  })
  it('getOrderBook(binance, ETH_BTC) have asks & bids', async () => {
    var result = await getOrderBook('binance', 'ETH_BTC')
    expect(Object.keys(result)).toEqual(
      expect.arrayContaining([ 'bids', 'asks' ])
    )
  })
})

