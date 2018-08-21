const ccxt = require ('ccxt')
var sleep = require('../../utils/utils').sleep

const updateBalance = async function(db, pr, timeout) {
    while (true) {
        await updateBalanceFromDB(db, pr)
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
// const prepareCoin = async function(data) {
//     try {
//         var filteredData = {}
//         for ( let [key, value] of Object.entries(data) ) {
//             if ( key[0] != '$' ) {
//                 var calc = calculateCoin(value, key)
//                 filteredData[key] = {
//                     "usd": calc.usd,
//                     "btc": calc.btc,
//                     "tkn": value
//                 }
//             }
//         }
//         return await filteredData
//     } catch (err) { console.log(err) }
// }
const updateBalanceFromDB = async function(db, pr) {
    try {
        if ( global.COINMARKETCAP) {
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
            for (let [stockName, stock] of Object.entries(pr)) {
                var exchange = new ccxt[stockName] ({
                    'enableRateLimit': true,
                    'apiKey': stock.apiKey,
                    'secret': stock.secret
                })
                var stockNameUpper = stockName.toUpperCase()
                var data = await exchange.fetch_balance()
                // console.log(data)
                var res = {
                    "stock": stockNameUpper,
                    "timestamp": Date.now(),
                    "datetime": new Date(Date.now()),
                    "data": {}
                }

                for (let [coin, value] of Object.entries(data.total)) {
                  if ( coin[0] != '$' ) {
                    if (value != 0) {
                      var calcTotal = await calculateCoin(value, coin)
                      var calcFree = await calculateCoin(data['free'][coin], coin)
                      var calcUsed = await calculateCoin(data['used'][coin], coin)

                      if ( res['data'][coin] === undefined ) res['data'][coin] = {}
                      res['data'][coin]['total'] = value
                      res['data'][coin]['totalUSD'] = calcTotal.usd
                      res['data'][coin]['totalBTC'] = calcTotal.btc
                      res['data'][coin]['used'] = data['used'][coin]
                      res['data'][coin]['usedUSD'] = calcUsed.usd
                      res['data'][coin]['usedBTC'] = calcUsed.btc
                      res['data'][coin]['free'] = data['free'][coin]
                      res['data'][coin]['freeUSD'] = calcFree.usd
                      res['data'][coin]['freeBTC'] = calcFree.btc

                      if ( total['data'][coin] === undefined ) {
                        total['data'][coin] = {
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
                      total['data'][coin]['total'] += value
                      total['data'][coin]['totalUSD'] += calcTotal.usd
                      total['data'][coin]['totalBTC'] += calcTotal.btc
                      total['totalBTC'] += calcTotal.btc
                      total['totalUSD'] += calcTotal.usd

                      total['data'][coin]['free'] += data['free'][coin]
                      total['data'][coin]['freeUSD'] += calcFree.usd
                      total['data'][coin]['freeBTC'] += calcFree.btc
                      total['freeBTC'] += calcFree.btc
                      total['freeUSD'] += calcFree.usd

                      total['data'][coin]['used'] += data['used'][coin]
                      total['data'][coin]['usedUSD'] += calcUsed.usd
                      total['data'][coin]['usedBTC'] += calcUsed.btc
                      total['usedBTC'] += calcUsed.btc
                      total['usedUSD'] += calcUsed.usd
                    }
                  }
                }


                if ( global.BALANCE === undefined ) global.BALANCE = {}
                if ( global.BALANCE[stockNameUpper] === undefined ) global.BALANCE[stockNameUpper] = {}
                global.BALANCE[stockNameUpper] = res
                await db.collection('balance').replaceOne({'stock': stockNameUpper}, res, {upsert: true})
                await db.collection('balanceTimeseries').replaceOne({'stock': stockNameUpper, "timestamp": res.timestamp }, res, {upsert: true})
            }
            console.log('balance')
            // console.log(total)
            await db.collection('balance').replaceOne({'stock': 'TOTAL'}, total, {upsert: true})
            await db.collection('balanceTimeseries').replaceOne({'stock': 'TOTAL', "timestamp": total.timestamp }, total, {upsert: true})
        }
    } catch (err) { console.log(err) }
}

module.exports = updateBalance

// {
//   stock: TOTAL,
//   timestamp: 1234,
//   datetime: ,
//   totalUSD:
//   totalBTC:
//   data: {
//       ETH: {free, used, total, freeUSD, usedUSD, totalUSD, freeBTC, usedBTC, totalBTC},
//   }
// }
//
// {
//   stock: LIQUI,
//   timestamp: 1234,
//   datetime: ,
//   totalUSD:
//   totalBTC:
//   data: {
//     ETH: {free, used, total, freeUSD, usedUSD, totalUSD, freeBTC, usedBTC, totalBTC},
//     BTC: {}
//   }
//
// }
