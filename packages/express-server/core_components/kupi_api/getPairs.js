const axios = require('axios')
const getPairs = async function(stockName) {
  try {
    var request = await axios.get(`http://api.kupi.network/${stockName}/pairs`)
    if (global.PAIRS[stockName] === undefined) { global.PAIRS[stockName] = [] }
    global.PAIRS[stockName] = request.data
    return request.data
  } catch (err) { console.log(err) }
}
exports.getPairs = getPairs
