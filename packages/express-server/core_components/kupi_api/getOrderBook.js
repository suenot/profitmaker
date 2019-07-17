const axios = require('axios')

const getOrderBook = async function(stock, pair) {
  try {
    // binance, ETH_BTC
    var response = await axios.get(`https://api.kupi.network/${stock}/orders/${pair}`)
    return response.data
  } catch (err) { console.log(err) }
}


exports.getOrderBook = getOrderBook
