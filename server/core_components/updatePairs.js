var sleep = require('../../utils').sleep
const axios = require('axios')

const updatePairs = async function(t) {
    while (true) {
        await updatePairsFromBD()
        await sleep(t)
    }
}
const updatePairsFromBD = async function() {
    try {

      var response = await axios.get(`http://144.76.109.194:8051/pairs/`)
      global.PAIRS = response.data

    } catch (err) { console.log(err) }
}

module.exports = updatePairs
