const axios = require('axios')

const getOHLCV = async function(stock, pair, timeframe) {
  // binance/candles/LTC_BTC/3m
  try {
    var response = await axios.get(`http://api.kupi.network/${stock}/candles/${pair}/${timeframe}`)
    return response.data
  } catch (err) { console.log(err) }
}

exports.getOHLCV = getOHLCV
