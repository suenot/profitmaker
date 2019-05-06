const ccxt = require ('ccxt')
const _ = require ('lodash')
const axios = require('axios')
var {sleep} = require('@kupi/sleep')
var {catchHead} = require('@kupi/catchHead')
var {calculateCoin} = require('@kupi/calculateCoin')

const updateBalance = async function(timeout) {
    while (true) {
      try {
        for ( let [account, accountIn] of Object.entries(global.ACCOUNTS) ) {
          if (accountIn.safe) {
            await updateStocksBalance(accountIn.safe, account)
          }
        }
      } catch(err) { console.log(err) }
      try {
        for (let [pocketName, pocket] of Object.entries(global.ETHPLORER)) {
          await updateETHBalance(pocket)
        }
      } catch(err) { console.log(err) }
      await updateTotal()
      await writeTotal()
      await sleep(timeout)
    }
}

const updateStocksBalance = async function(ccxtKey, account) {
  if ( _.isEmpty(global.COINMARKETCAP) ) { return false }
  try {
    var rateLimit = global.CCXT[ccxtKey]['rateLimit'] + 700
    await catchHead(rateLimit, account)
    var data = await global.CCXT[ccxtKey].fetch_balance()
    if ( global.BALANCE[account] === undefined ) global.BALANCE[account] = {}
    global.BALANCE[account] = await calculateStockBalance(data, account)
  } catch (err) { console.log(err) }
}

const calculateStockBalance = async function(data, account) {
  var res = {
    "stock": account,
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
  if (!_.isEmpty(data.total)) {
    for (let [coin, value] of Object.entries(data.total)) {
      if ( coin[0] != '$' ) {
        if (value != 0) {

          var calcTotal = await calculateCoin(value, coin)
          var calcFree = await calculateCoin(data['free'][coin], coin)
          var calcUsed = await calculateCoin(data['used'][coin], coin)

          res['data'][coin] = {
            'shortName': coin,
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
  }
  return res
}

const updateETHBalance = async function(pocket) {
  if ( _.isEmpty(global.COINMARKETCAP) ) { return false }
  try {
    await catchHead(500, pocket.name)
    var data = await axios.get('http://api.ethplorer.io/getAddressInfo/' + pocket.address + '?apiKey=freekey')
    if ( global.BALANCE[pocket.name] === undefined ) global.BALANCE[pocket.name] = {}
    global.BALANCE[pocket.name] = await calculateETHBalance(data, pocket.name)
  } catch (err) { console.log(err) }
}

const calculateETHBalance = async function(data, name) {
  var res = {
    "stock": name,
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

  var ethCalc = await calculateCoin(data.data['ETH']['balance'], 'ETH')
  res['data']['ETH'] = {
    'shortName': 'ETH',
    'total': data.data['ETH']['balance'],
    'totalUSD': ethCalc.usd,
    'totalBTC': ethCalc.btc,
    'used': 0,
    'usedUSD': 0,
    'usedBTC': 0,
    'free': data.data['ETH']['balance'],
    'freeUSD': ethCalc.usd,
    'freeBTC': ethCalc.btc
  }
  res.freeBTC += ethCalc.btc
  res.freeUSD += ethCalc.usd
  res.usedBTC += 0
  res.usedUSD += 0
  res.totalBTC += ethCalc.btc
  res.totalUSD += ethCalc.usd

  // console.log(data.data.tokens)
  for (let [i, token] of Object.entries(data.data.tokens)) {
    var decimals = token['tokenInfo']['decimals']
    var symbol = token['tokenInfo']['symbol']
    var balance = token['balance'] / 10**decimals
    var calc = await calculateCoin(balance, symbol)
    // console.log(calc)
    // console.log(token['tokenInfo'])

    if (token['tokenInfo']['price'] == false) {
      res['data'][symbol] = {
        'shortName': symbol,
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
        'shortName': symbol,
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
  return res
}

const updateTotal = async function () {
  if ( _.isEmpty(global.COINMARKETCAP) ) { return false }
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
        for (let [key, value] of Object.entries(stock.data)) {
          if ( total['data'][key] === undefined ) {
            total['data'][key] = {
              'shortName': key,
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

const writeTotal = async function () {
  if ( _.isEmpty(global.COINMARKETCAP) ) { return false }
  try {
    for (let [stockName, stock] of Object.entries(global.BALANCE)) {
        await global.MONGO.collection('balance').replaceOne({'stock': stockName}, stock, {upsert: true})
        await global.MONGO.collection('balanceTimeseries').replaceOne({'stock': stockName, "timestamp": stock.timestamp }, stock, {upsert: true}) // TODO заменить на insert
    }
    console.log('Balance saved')
  } catch (err) { console.log(err) }
}
exports.updateBalance = updateBalance

exports.calculateStockBalance = calculateStockBalance
exports.calculateETHBalance = calculateETHBalance
