const ccxt = require ('ccxt')
const _ = require ('lodash')
const axios = require('axios')
var sleep = require('../../utils').sleep
var catchHead = require('../../utils').catchHead
var calculateCoin = require('../../utils').calculateCoin

const updateBalance = async function(timeout) {
    // console.log('updateBalance')
    // console.log(global.CCXT)
    while (true) {
      try {
        for (let [ccxtKey, ccxtObject] of Object.entries(global.CCXT)) {
          // console.log('******')
          let [keyID, keyType] = ccxtKey.split('--')
          // global.CCXT[`${key.id}--${keyType}`]
          if ( keyType === "safe") {

            // console.log('*****', ccxtObject.kupi_keyName)
            // console.log(keyID)
            // console.log(keyType)
            var kupi_keyName = ccxtObject.kupi_keyName
            await updateStocksBalance(ccxtKey, kupi_keyName)

            // await getBalance(ccxtKey, kupi_keyName)
          }
        }
      } catch(err) { console.log(err) }
      try {
        for (let [pocketName, pocket] of Object.entries(global.ETHPLORER)) {
          // console.log(pocketName)
          // console.log(pocket)
          await updateETHBalance(pocket)
        }
      } catch(err) { console.log(err) }
      await updateTotal()
      await writeTotal()
      await sleep(timeout)
    }
}

// const getBalance = async function(ccxtKey, kupi_keyName) {
//   console.log(kupi_keyName)
//   var data = await global.CCXT[ccxtKey].fetch_balance()
//   console.log(data)
// }
const updateStocksBalance = async function(ccxtKey, kupi_keyName) {
  if ( _.isEmpty(global.COINMARKETCAP) ) { return false }
  try {
    var rateLimit = global.CCXT[ccxtKey]['rateLimit'] + 700
    // var stockNameUpper = stockName.toUpperCase()
    await catchHead(rateLimit, kupi_keyName)
    var data = await global.CCXT[ccxtKey].fetch_balance()
    var res = await calculateStockBalance(data, kupi_keyName)

    if ( global.BALANCE[kupi_keyName] === undefined ) global.BALANCE[kupi_keyName] = {}
    global.BALANCE[kupi_keyName] = res
    // console.log(stockNameUpper, global.BALANCE[stockNameUpper]['totalUSD'])
  } catch (err) { console.log(err) }
}

const calculateStockBalance = async function(data, kupi_keyName) {
  var res = {
    "stock": kupi_keyName,
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
  if (data.total) {
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
    // var stockNameUpper = stockName.toUpperCase()
    await catchHead(500, pocket.name)
    var data = await axios.get('http://api.ethplorer.io/getAddressInfo/' + pocket.address + '?apiKey=freekey')
    var res = await calculateETHBalance(data, pocket.name)

    if ( global.BALANCE[pocket.name] === undefined ) global.BALANCE[pocket.name] = {}
    global.BALANCE[pocket.name] = res
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
  for (let [i, token] of Object.entries(data.data.tokens)) {
    var decimals = token['tokenInfo']['decimals']
    var symbol = token['tokenInfo']['symbol']
    var balance = token['balance'] / 10**decimals
    var calc = await calculateCoin(balance, symbol)
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
      // console.log(stockName)
        for (let [key, value] of Object.entries(stock.data)) {
          // console.log(key, value)
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
        // var stockNameUpper = stockName.toUpperCase()
        await global.MONGO.collection('balance').replaceOne({'stock': stockName}, stock, {upsert: true})
        await global.MONGO.collection('balanceTimeseries').replaceOne({'stock': stockName, "timestamp": stock.timestamp }, stock, {upsert: true}) // TODO заменить на insert
    }
    console.log('balance saved')
  } catch (err) { console.log(err) }
}
exports.updateBalance = updateBalance

exports.calculateStockBalance = calculateStockBalance
exports.calculateETHBalance = calculateETHBalance
