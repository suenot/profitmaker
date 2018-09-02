var sleep = require('../../utils').sleep
const axios = require('axios')

const updateMarkets = async function(t) {
    while (true) {
        await updateMarketsFromBD()
        await sleep(t)
    }
}
const updateMarketsFromBD = async function() {
  try {

    var response = await axios.get(`http://144.76.109.194:8051/stocks/`)
    // console.log(global.MARKETS)
    global.MARKETS = response.data


  } catch (err) { console.log(err) }
}

const getStocks = async function() {
  try {
    var response = await axios.get(`http://144.76.109.194:8051/stocks/`)
    return response.data
  } catch (err) { console.log(err) }
}


exports.updateMarkets = updateMarkets
exports.updateMarketsFromBD = updateMarketsFromBD
exports.getStocks = getStocks
