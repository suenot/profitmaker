var sleep = require('../../utils').sleep
const axios = require('axios')

const updateTradesRaw = async function(t) {
    while (true) {
        await updateTradesRawFromBD()
        await sleep(t)
    }
}
const updateTradesRawFromBD = async function() {
    try {

      var response = await axios.get(`http://144.76.109.194:8051/tradesRaw/`)
      global.TRADESRAW = response.data

    } catch (err) { console.log(err) }
}

module.exports = updateTradesRaw
