var {calculateStockBalance, calculateETHBalance} = require('../core_components/updateBalance')

global.COINMARKETCAP = {
  "BTC":{"price_usd":"1000","price_btc":"1"},
  "ETH":{"price_usd":"1","price_btc":"0.1"},
  "VIU":{"price_usd":"1","price_btc":"0.1"},
  "DNT":{"price_usd":"1","price_btc":"0.1"},
  "OAX":{"price_usd":"1","price_btc":"0.1"},
  "WISE":{"price_usd":"1","price_btc":"0.1"}
}
// https://github.com/ccxt/ccxt/wiki/Manual#querying-account-balance
const balancerequest = {
  'free':  {
    'BTC': 1,
    'ETH': 1,
  },
  'used':  {
    'BTC': 1,
    'ETH': 1,
  },
  'total': {
    'BTC': 2,
    'ETH': 2
  },
  'BTC':   {
    'free': 1,
    'used': 1,
    'total': 2
  },
  'ETH': {
    'free': 1,
    'used': 1,
    'total': 2
  }
}

const ethrequest = {"data":
{"address":"0xc2175fa035c0d9961f9c6ddf9848d7e1721d29ca",
"ETH":{"balance":1},"countTxs":161,
"tokens":[
  {"tokenInfo":{"address":"0x701c244b988a513c945973defa05de933b23fe1d","name":"openANX Token","decimals":"18","symbol":"OAX","totalSupply":"100000000000000000000000000","owner":"0xa0c81e7bca6b95b6cb1d6d4e5db744228ed6f5c1","lastUpdated":1549687356,"issuancesCount":0,"holdersCount":7064,"ethTransfersCount":422,"price":{"rate":0.124898684242,"diff":5.34,"diff7d":-8,"ts":1549713483,"marketCapUsd":3123622.3664218,"availableSupply":25009249.58,"volume24h":718637.66675466,"diff30d":27.684402820581,"currency":"USD"}},"balance":1000000000000000000,"totalIn":0,"totalOut":0},

  {"tokenInfo":{"address":"0xe769d988ceda1559aee07963e59e62bd730dbba6","name":"WisePlat Token","decimals":"18","symbol":"WISE","totalSupply":"10000000000000000000000000","owner":"0x427b7afa221743f76a75394f31147d85e2a5b2ac","lastUpdated":1545386756,"issuancesCount":0,"holdersCount":39996,"ethTransfersCount":0,"price":false},"balance":1000000000000000000,"totalIn":0,"totalOut":0},

  {"tokenInfo":{"address":"0x519475b31653e46d20cd09f9fdcf3b12bdacb4f5","name":"VIU","decimals":"18","symbol":"VIU","totalSupply":"1000000000000000000000000000","owner":"","lastUpdated":1549680070,"issuancesCount":0,"holdersCount":955990,"ethTransfersCount":5,"price":{"rate":0.000155791250668,"diff":-8.29,"diff7d":6.24,"ts":1549713483,"marketCapUsd":73142.488172102,"availableSupply":469490345.95,"volume24h":62.457785491708,"diff30d":-1.1263407527147,"currency":"USD"}},"balance":1000000000000000000,"totalIn":0,"totalOut":0},

  {"tokenInfo":{"address":"0x0abdace70d3790235af448c88547603b945604ea","name":"district0x Network Token","decimals":"18","symbol":"DNT","totalSupply":"1000000000000000000000000000","owner":"","lastUpdated":1549710857,"issuancesCount":0,"holdersCount":31011,"ethTransfersCount":30,"price":{"rate":0.0109293105832,"diff":4.43,"diff7d":3.94,"ts":1549713483,"marketCapUsd":6557586.34992,"availableSupply":600000000,"volume24h":797270.55094816,"diff30d":-7.3970590831927,"currency":"USD"}},"balance":1000000000000000000,"totalIn":0,"totalOut":0}
]}}

describe('calculate balance', () => {
  it('', async () => {
    var result = await calculateStockBalance(balancerequest, 'name')
    expect(result.freeBTC).toEqual(1.1)
    expect(result.freeUSD).toEqual(1001)
    expect(result.usedBTC).toEqual(1.1)
    expect(result.usedUSD).toEqual(1001)
    expect(result.stock).toEqual('name')
    expect(result.totalBTC).toEqual(2.2)
    expect(result.totalUSD).toEqual(2002)
    expect(result.data['BTC'].free).toEqual(1)
    expect(result.data['BTC'].freeBTC).toEqual(1)
    expect(result.data['BTC'].freeUSD).toEqual(1000)
    expect(result.data['BTC'].total).toEqual(2)
    expect(result.data['BTC'].totalBTC).toEqual(2)
    expect(result.data['BTC'].totalUSD).toEqual(2000)
    expect(result.data['BTC'].used).toEqual(1)
    expect(result.data['BTC'].usedBTC).toEqual(1)
    expect(result.data['BTC'].usedUSD).toEqual(1000)
  })
})
describe('calculate eth balance', () => {
  it('', async () => {
    var result = await calculateETHBalance(ethrequest, 'name')
    expect(result.freeBTC).toEqual(0.4)
    expect(result.freeUSD).toEqual(4)
    expect(result.stock).toEqual('name')
    expect(result.totalBTC).toEqual(0.4)
    expect(result.totalUSD).toEqual(4)
    expect(result.data['DNT'].total).toEqual(1)
    expect(result.data['DNT'].totalUSD).toEqual(1)
    expect(result.data['DNT'].totalBTC).toEqual(0.1)

  })
})
