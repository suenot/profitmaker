const axios = require('axios')

const getOHLCV = async function(stock, pair) {
  try {
    var response = await axios.get(`http://api.kupi.network/${stock}/ohlcv/${pair}`)
    return response.data
  } catch (err) { console.log(err) }
}

exports.getOHLCV = getOHLCV
