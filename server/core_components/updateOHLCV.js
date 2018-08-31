var sleep = require('../../utils').sleep
const axios = require('axios')

const updateOHLCV = async function(t) {
    while (true) {
        await updateOHLCVFromBD()
        await sleep(t)
    }
}
const updateOHLCVFromBD = async function() {
    try {

      var response = await axios.get(`http://144.76.109.194:8051/ohlcv/`)
      global.OHLCV = response.data

    } catch (err) { console.log(err) }
}

module.exports = updateOHLCV
