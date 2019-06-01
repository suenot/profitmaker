var {sleep} = require('@kupi/sleep')
const axios = require('axios')

const getStocksCycle = async function(t) {
  while (true) {
    await getStocks()
    await sleep(t)
  }
}

const getStocks = async function() {
  try {
    var response = await axios.get(`http://api.kupi.network/stocks/`)
    global.MARKETS = response.data
    return response.data
  } catch (err) { console.log(err) }
}


exports.getStocksCycle = getStocksCycle
exports.getStocks = getStocks
