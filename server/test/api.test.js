var getMyTrades = require('../core_components/getMyTrades')
var {getPairs} = require('../core_components/getPairs')
var {getStocks} = require('../core_components/getStocks')

global.PAIRS = {}


describe('getPairs test find ETH/BTC', () => {
  it('matches even if received contains additional elements', async () => {
    
    var result = await getPairs('binance')
    expect(result).toEqual(expect.arrayContaining(['ETH/BTC']))
  })
})

describe('getStocks test find binance', () => {
  it('matches even if received contains additional elements', async () => {
    var result = await getStocks()
    expect(result['BINANCE']['name']).toEqual('BINANCE')
  })
})  

