const _ = require('lodash')
const moment = require('moment')


const balanceHistory = async function(stock) {
  try {
    var balanceHistory = await global.MONGO.collection('balanceTimeseries').find({
      'stock': stock,
      'datetime' : {
        $lt: new Date(),
        $gte: new Date(new Date().setDate(new Date().getDate()-7))
      }
    }).limit(24*7).toArray()
    // глобальные переменные
    var BALANCE_HISTORY_COINS = new Set()
    var BALANCE_HISTORY_COINS_RESULT = new Set()
    var BALANCE_HISTORY_TIMESTAMPS = []
    var BALANCE_HISTORY_DATETIMES = []
    var BALANCE_HISTORY_USD = {} // [] for every coin
    var BALANCE_HISTORY_BTC = {} // [] for every coin
    var SERIES = []

    // составляем множество из монет
    _.forEach(balanceHistory, function(item){
      BALANCE_HISTORY_TIMESTAMPS.push(item.timestamp)
      BALANCE_HISTORY_DATETIMES.push(moment(item.timestamp).format('DD.MM.YY HH:mm'))
      _.forEach(item.data, function(coinData, coin){
        BALANCE_HISTORY_COINS.add(coin)
        BALANCE_HISTORY_USD[coin] = []
        BALANCE_HISTORY_BTC[coin] = []
      })
    })

    // init Other
    BALANCE_HISTORY_COINS.add('Other')
    BALANCE_HISTORY_USD['Other'] = []
    BALANCE_HISTORY_BTC['Other'] = []
    var otherTotalUSD = 0
    var otherTotalBTC = 0

    // записываем балансы по монетам (даже нулевые)
    _.forEach(balanceHistory, function(item){
      _.forEach(Array.from(BALANCE_HISTORY_COINS), function(coin){
        if (item.data[coin]) {
          // если монета есть

          if ( (item.data[coin].totalUSD/item.totalUSD*100) > 10) {
            // если % > 5
            BALANCE_HISTORY_COINS_RESULT.add(coin)
            BALANCE_HISTORY_USD[coin].push(item.data[coin].totalUSD)
            BALANCE_HISTORY_BTC[coin].push(item.data[coin].totalBTC)
          } else {
            // плюсуем к Other
            otherTotalUSD = item.data[coin].totalUSD
            otherTotalBTC = item.data[coin].totalBTC
            BALANCE_HISTORY_COINS_RESULT.add('Other')
          }
        } else {
          BALANCE_HISTORY_USD[coin].push(0)
          BALANCE_HISTORY_BTC[coin].push(0)

        }
      })
      // add Other
      BALANCE_HISTORY_USD['Other'].push(otherTotalUSD)
      BALANCE_HISTORY_BTC['Other'].push(otherTotalBTC)
      otherTotalUSD = 0
      otherTotalBTC = 0
    })



    // собираем series
    _.forEach(Array.from(BALANCE_HISTORY_COINS_RESULT), function(coin){
      SERIES.push({
        name: coin,
        type: 'line',
        stack: '',
        areaStyle: {normal: {}},
        data: BALANCE_HISTORY_USD[coin]
      })
    })
    return {
      coins: Array.from(BALANCE_HISTORY_COINS_RESULT),
      timestamps: BALANCE_HISTORY_DATETIMES,
      series: SERIES
    }
  } catch(err) {console.log(err)}

}

module.exports = balanceHistory
