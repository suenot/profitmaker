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

const getOHLCV = async function(stock, pair) {
  try {
    // var stock = stock.toUpperCase()
    // var pair = pair.toUpperCase()
    var response = await axios.get(`http://144.76.109.194:8051/ohlcv/${stock}/${pair}`)
    return response.data
  } catch (err) { console.log(err) }
}

exports.updateOHLCV = updateOHLCV
exports.updateOHLCVFromBD = updateOHLCVFromBD
exports.getOHLCV = getOHLCV
