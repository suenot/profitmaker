const ccxt = require ('ccxt')
const axios = require('axios')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead
var calculateCoin = require('../../utils').calculateCoin

const updateBalance = async function(db, privateKeys, ethPockets, timeout) {
    while (true) {
      for (let [stockName, stock] of Object.entries(privateKeys)) {
        await updateStocksBalance(stockName)
      }
      for (let [stockName, stock] of Object.entries(ethPockets)) {
        await updateETHBalance(stockName, stock)
      }
      await updateTotal()
      await writeTotal(db)
      await sleep(timeout)
    }
}

const updateStocksBalance = async function(stockName) {
  if (!global.COINMARKETCAP) { return false }
  try {
    var rateLimit = global.STOCKS[stockName]['rateLimit']
    var stockNameUpper = stockName.toUpperCase()
    await catchHead(rateLimit, stockName)
    var data = await global.STOCKS[stockName].fetch_balance()
    var res = {
        "stock": stockNameUpper,
        "timestamp": Date.now(),
        "datetime": new Date(Date.now()),
        "freeBTC": 0,
        "freeUSD": 0,
        "usedBTC": 0,
        "usedUSD": 0,
        "totalBTC": 0,
        "totalUSD": 0,
        "data": {}
    }
    for (let [coin, value] of Object.entries(data.total)) {
      if ( coin[0] != '$' ) {
        if (value != 0) {
          var calcTotal = await calculateCoin(value, coin)
          var calcFree = await calculateCoin(data['free'][coin], coin)
          var calcUsed = await calculateCoin(data['used'][coin], coin)
          res['data'][coin] = {
            'total': value,
            'totalUSD': calcTotal.usd,
            'totalBTC': calcTotal.btc,
            'used': data['used'][coin],
            'usedUSD': calcUsed.usd,
            'usedBTC': calcUsed.btc,
            'free': data['free'][coin],
            'freeUSD': calcFree.usd,
            'freeBTC': calcFree.btc
          }
          res.freeBTC += calcFree.btc
          res.freeUSD += calcFree.usd
          res.usedBTC += calcUsed.btc
          res.usedUSD += calcUsed.usd
          res.totalBTC += calcTotal.btc
          res.totalUSD += calcTotal.usd
        }
      }
    }
    if ( global.BALANCE === undefined ) global.BALANCE = {}
    if ( global.BALANCE[stockNameUpper] === undefined ) global.BALANCE[stockNameUpper] = {}
    global.BALANCE[stockNameUpper] = res
    // console.log(stockNameUpper, global.BALANCE[stockNameUpper]['totalUSD'])
  } catch (err) { console.log(err) }
}

const updateETHBalance = async function(stockName, stock) {
  if (!global.COINMARKETCAP) { return false }
  try {
    var stockNameUpper = stockName.toUpperCase()
    var res = {
        "stock": stockNameUpper,
        "timestamp": Date.now(),
        "datetime": new Date(Date.now()),
        "freeBTC": 0,
        "freeUSD": 0,
        "usedBTC": 0,
        "usedUSD": 0,
        "totalBTC": 0,
        "totalUSD": 0,
        "data": {}
    }

    await catchHead(500, stockName)
    var response = await axios.get('http://api.ethplorer.io/getAddressInfo/' + stock.address + '?apiKey=freekey')
    var ethCalc = await calculateCoin(response.data['ETH']['balance'], 'ETH')
    res['data']['ETH'] = {
      'total': response.data['ETH']['balance'],
      'totalUSD': ethCalc.usd,
      'totalBTC': ethCalc.btc,
      'used': 0,
      'usedUSD': 0,
      'usedBTC': 0,
      'free': response.data['ETH']['balance'],
      'freeUSD': ethCalc.usd,
      'freeBTC': ethCalc.btc
    }
    res.freeBTC += ethCalc.btc
    res.freeUSD += ethCalc.usd
    res.usedBTC += 0
    res.usedUSD += 0
    res.totalBTC += ethCalc.btc
    res.totalUSD += ethCalc.usd
    for (let [i, token] of Object.entries(response.data.tokens)) {
      var decimals = token['tokenInfo']['decimals']
      var symbol = token['tokenInfo']['symbol']
      var balance = token['balance'] / 10**decimals
      var calc = await calculateCoin(balance, symbol)
      // console.log(token['tokenInfo'])
      if (token['tokenInfo']['price'] == false) {
        res['data'][symbol] = {
          'total': balance,
          'totalUSD': 0,
          'totalBTC': 0,
          'used': 0,
          'usedUSD': 0,
          'usedBTC': 0,
          'free': balance,
          'freeUSD': 0,
          'freeBTC': 0
        }
      } else {
        res['data'][symbol] = {
          'total': balance,
          'totalUSD': calc.usd,
          'totalBTC': calc.btc,
          'used': 0,
          'usedUSD': 0,
          'usedBTC': 0,
          'free': balance,
          'freeUSD': calc.usd,
          'freeBTC': calc.btc
        }
        res.freeBTC += calc.btc
        res.freeUSD += calc.usd
        res.usedBTC += 0
        res.usedUSD += 0
        res.totalBTC += calc.btc
        res.totalUSD += calc.usd
      }
    }
    if ( global.BALANCE === undefined ) global.BALANCE = {}
    if ( global.BALANCE[stockNameUpper] === undefined ) global.BALANCE[stockNameUpper] = {}
    global.BALANCE[stockNameUpper] = res
  } catch (err) { console.log(err) }
}

const updateTotal = async function () {
  if (!global.COINMARKETCAP) { return false }
  try {
    var total = {
      "stock": "TOTAL",
      "timestamp": Date.now(),
      "datetime": new Date(Date.now()),
      "freeBTC": 0,
      "freeUSD": 0,
      "usedBTC": 0,
      "usedUSD": 0,
      "totalBTC": 0,
      "totalUSD": 0,
      "data": {}
    }
    for (let [stockName, stock] of Object.entries(global.BALANCE)) {
      if (stockName != 'TOTAL') {
      // console.log(stockName)
        for (let [key, value] of Object.entries(stock.data)) {
          // console.log(key, value)
          if ( total['data'][key] === undefined ) {
            total['data'][key] = {
              'total': 0,
              'totalUSD': 0,
              'totalBTC': 0,
              'used': 0,
              'usedUSD': 0,
              'usedBTC': 0,
              'free': 0,
              'freeUSD': 0,
              'freeBTC': 0
            }
          }
          total['data'][key]['total'] += value.total
          total['data'][key]['totalUSD'] += value.totalUSD
          total['data'][key]['totalBTC'] += value.totalBTC
          total.totalBTC += value.totalBTC
          total.totalUSD += value.totalUSD

          total['data'][key]['free'] += value.free
          total['data'][key]['freeUSD'] += value.freeUSD
          total['data'][key]['freeBTC'] += value.freeBTC
          total.freeBTC += value.freeBTC
          total.freeUSD += value.freeUSD

          total['data'][key]['used'] += value.used
          total['data'][key]['usedUSD'] += value.usedUSD
          total['data'][key]['usedBTC'] += value.usedBTC
          total.usedBTC += value.usedBTC
          total.usedUSD += value.usedUSD
        }
      }
    }
    global.BALANCE['TOTAL'] = total
  } catch (err) { console.log(err) }
}

const writeTotal = async function (db) {
  if (!global.COINMARKETCAP) { return false }
  try {
    for (let [stockName, stock] of Object.entries(global.BALANCE)) {
        var stockNameUpper = stockName.toUpperCase()
        await db.collection('balance').replaceOne({'stock': stockNameUpper}, stock, {upsert: true})
        await db.collection('balanceTimeseries').replaceOne({'stock': stockNameUpper, "timestamp": stock.timestamp }, stock, {upsert: true}) // TODO заменить на insert
    }
    console.log('balance saved')
  } catch (err) { console.log(err) }
}
module.exports = updateBalance
