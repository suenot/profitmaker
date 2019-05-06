const axios = require('axios')
const getTrades = async function(stock, pair) {
  try {
    var request = await axios.get(`http://api.kupi.network/${stock}/trades/${pair}`)
    return request.data
  } catch (err) {
    console.log(err)
    return {}
  }
}
exports.getTrades = getTrades
