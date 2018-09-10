const _ = require('lodash')


const balanceHistory = async function(stock, db) {
  try {
    var balanceHistory = await db.collection('balanceTimeseries').find({'stock': stock}).toArray()
    // TODO вынести в глобальные переменные и в отдельный файл
    var BALANCE_HISTORY_COINS = new Set()
    var BALANCE_HISTORY_TIMESTAMPS = []
    var BALANCE_HISTORY_USD = {} // [] for every coin
    var BALANCE_HISTORY_BTC = {} // [] for every coin
    var SERIES = []
    // составляем множество из монет
    _.forEach(balanceHistory, function(item){
      BALANCE_HISTORY_TIMESTAMPS.push(item.timestamp)
      _.forEach(item.data, function(coinData, coin){
        BALANCE_HISTORY_COINS.add(coin)
        BALANCE_HISTORY_USD[coin] = []
        BALANCE_HISTORY_BTC[coin] = []
      })
    })
    // записываем балансы по монетам (даже нулевые)
    _.forEach(balanceHistory, function(item){
      _.forEach([...BALANCE_HISTORY_COINS], function(coin){
        if (item.data[coin]) {
          BALANCE_HISTORY_USD[coin].push(item.data[coin].totalUSD)
          BALANCE_HISTORY_BTC[coin].push(item.data[coin].totalBTC)
        } else {
          BALANCE_HISTORY_USD[coin].push(0)
          BALANCE_HISTORY_BTC[coin].push(0)
        }
      })
    })
    // собираем series
    _.forEach([...BALANCE_HISTORY_COINS], function(coin){
      SERIES.push({
        name: coin,
        type:'line',
        stack: '总量',
        areaStyle: {normal: {}},
        data: BALANCE_HISTORY_USD[coin]
      })
    })
    return {
      coins: [...BALANCE_HISTORY_COINS],
      timestamps: BALANCE_HISTORY_TIMESTAMPS,
      series: SERIES
    }

  } catch(err) {console.log(err)}

}

module.exports = balanceHistory
