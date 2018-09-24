var sleep = require('../../utils').sleep
const axios = require('axios')

const getOrderBook = async function(stock, pair) {
  try {
    var response = await axios.get(`http://api.kupi.network/${stock}/orders/${pair}/`)
    if (global.ORDERBOOK[stock] === undefined) { global.ORDERBOOK[stock] = {} }
    global.ORDERBOOK[stock][pair] = response.data
    return response.data
  } catch (err) { console.log(err) }
}


exports.getOrderBook = getOrderBook
