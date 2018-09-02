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
      // console.log(global.TRADESRAW)
    } catch (err) { console.log(err) }
}

const getTrades = async function(stock, pair) {
  try {
    var request = await axios.get(`http://144.76.109.194:8051/trades/${stock}/${pair}`)
    return request.data
  } catch (err) { console.log(err) }
}


exports.updateTradesRaw = updateTradesRaw
exports.updateTradesRawFromBD = updateTradesRawFromBD
exports.getTrades = getTrades
