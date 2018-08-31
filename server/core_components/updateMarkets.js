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
    global.MARKETS = response.data


  } catch (err) { console.log(err) }
}

module.exports = updateMarkets
