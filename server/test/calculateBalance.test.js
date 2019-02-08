var {calculateCoin} = require('../../utils')

var {calculateStockBalance, calculateETHBalance} = require('../core_components/updateBalance')


// jest.mock("../calculateCoin")
// calculateCoin.mockImplementation(() => 'catchHead mock works')

global.COINMARKETCAP = {
  "ETH":{"id":"ethereum","name":"Ethereum","symbol":"ETH","rank":"3","price_usd":"108.488726894","price_btc":"0.03151528","24h_volume_usd":"2597187498.12","market_cap_usd":"11366727734.0","available_supply":"104773353.0","total_supply":"104773353.0","max_supply":null,"percent_change_1h":"-0.12","percent_change_24h":"3.0","percent_change_7d":"1.58","last_updated":"1549629856"}
}
describe('calculate balance', () => {
  it('', async () => {

    var result = calculateCoin('ETH', 10)
    expect(result.btc).toEqual('catchHead mock works')


  })
})
