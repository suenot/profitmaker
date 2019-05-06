var {catchHead} = require('@kupi/catchHead')

// IN
// 'binance', 'ETH'
const fetchDeposit = async function(stockName, symbol) {
  if (global.STOCKS[stockName].has['fetchDepositAddress']) {
    try {
      await catchHead(global.STOCKS[stockName]['rateLimit'], stockName)
      let depositInfo = await global.STOCKS[stockName].fetchDepositAddress(symbol)
      return depositInfo
    } catch (err) {
      return 'fetchDeposit in progress. Croitor we belive in you'
    }
  } else {
    return 'stock is so awesome. no deposits here'
  }
}
exports.fetchDeposit = fetchDeposit
// OUT
// {{ currency: 'ETH',
//   address: '0xb028d2f0e0d7be53c6358924f15eff452178b70e',
//   tag: '',
//   info:
//    { address: '0xb028d2f0e0d7be53c6358924f15eff452178b70e',
//      success: true,
//      addressTag: '',
//      asset: 'ETH' } }
