const ccxt = require ('ccxt')
var sleep = require('../../utils/utils').sleep
const axios = require('axios')

const updateBalance = async function(db, privateKeys, timeout) {
    while (true) {
        await updateBalanceFromDB(db, privateKeys)
        await sleep(timeout) // 10s
    }
}

const calculateCoin = async function (amount, coin) {
    try {
        return total = {
            "btc": global.COINMARKETCAP[coin]['price_btc'] * amount,
            "usd": global.COINMARKETCAP[coin]['price_usd'] * amount
        }
    } catch (err) {
        return { "btc": 0, "usd": 0 }
    }
}

var TOTAL
const totalInit = function () {
  TOTAL = {
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
}

const updateTotal = function (coin, totalUSD, totalBTC, total, usedUSD, usedBTC, used, freeBTC, freeUSD, free) {
  if ( TOTAL['data'][coin] === undefined ) {
    TOTAL['data'][coin] = {
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
  TOTAL['data'][coin]['total'] += total
  TOTAL['data'][coin]['totalUSD'] += totalUSD
  TOTAL['data'][coin]['totalBTC'] += totalBTC
  TOTAL['totalBTC'] += totalBTC
  TOTAL['totalUSD'] += totalUSD

  TOTAL['data'][coin]['free'] += free
  TOTAL['data'][coin]['freeUSD'] += freeUSD
  TOTAL['data'][coin]['freeBTC'] += freeBTC
  TOTAL['freeBTC'] += freeBTC
  TOTAL['freeUSD'] += freeUSD

  TOTAL['data'][coin]['used'] += used
  TOTAL['data'][coin]['usedUSD'] += usedUSD
  TOTAL['data'][coin]['usedBTC'] += usedBTC
  TOTAL['usedBTC'] += usedBTC
  TOTAL['usedUSD'] += usedUSD
}


const updateBalanceFromDB = async function(db, privateKeys) {
    try {
        if (!global.COINMARKETCAP) { return false }
        totalInit()
        for (let [stockName, stock] of Object.entries(privateKeys)) {
          var stockNameUpper = stockName.toUpperCase()
          var res = {
              "stock": stockNameUpper,
              "timestamp": Date.now(),
              "datetime": new Date(Date.now()),
              "data": {}
          }
          if (stockName == 'ethplorer') {
            try {
              var response = await axios.get('http://api.ethplorer.io/getAddressInfo/' + stock.key + '?apiKey=freekey')

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
              updateTotal('ETH', ethCalc.usd, ethCalc.btc, response.data['ETH']['balance'], 0, 0, 0, ethCalc.btc, ethCalc.usd, response.data['ETH']['balance'])

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
                  updateTotal(symbol, 0, 0, balance, 0, 0, 0, 0, 0, balance)
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
                  updateTotal(symbol, calc.usd, calc.btc, balance, 0, 0, 0, calc.btc, calc.usd, balance)
                }

              }
            } catch (err) { console.log(err) }
          } else {
            var exchange = new ccxt[stockName] ({
                'enableRateLimit': true,
                'apiKey': stock.apiKey,
                'secret': stock.secret
            })
            var data = await exchange.fetch_balance() // TODO cachHead
            await sleep(500)
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
                  updateTotal(coin, calcTotal.usd, calcTotal.btc, value, calcUsed.usd, calcUsed.btc, data['used'][coin], calcFree.btc, calcFree.usd, data['free'][coin])
                }
              }
            }
          }
          if ( global.BALANCE === undefined ) global.BALANCE = {}
          if ( global.BALANCE[stockNameUpper] === undefined ) global.BALANCE[stockNameUpper] = {}
          global.BALANCE[stockNameUpper] = res
        }
        global.BALANCE['TOTAL'] = TOTAL
        for (let [stockName, stock] of Object.entries(global.BALANCE)) {
            var stockNameUpper = stockName.toUpperCase()
            await db.collection('balance').replaceOne({'stock': stockNameUpper}, stock, {upsert: true})
            await db.collection('balanceTimeseries').replaceOne({'stock': stockNameUpper, "timestamp": stock.timestamp }, stock, {upsert: true}) // TODO заменить на insert
        }
        console.log('balance')
    } catch (err) { console.log(err) }
}


module.exports = updateBalance
