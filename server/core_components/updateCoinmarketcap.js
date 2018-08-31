var sleep = require('../../utils').sleep
const axios = require('axios')

const updateCoinmarketcap = async function(t) {
    while (true) {
        await updateCoinmarketcapFromBD()
        await sleep(t)
    }
}
const updateCoinmarketcapFromBD = async function() {
    try {
      var response = await axios.get(`http://144.76.109.194:8051/coinmarketcap/`)
      global.COINMARKETCAP = response.data
    } catch (err) { console.log(err) }
}

module.exports = updateCoinmarketcap
