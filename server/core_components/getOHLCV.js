var sleep = require('../../utils').sleep
const axios = require('axios')

// const getOHLCVCycle = async function(t) {
//     while (true) {
//         await getOHLCV()
//         await sleep(t)
//     }
// }


const getOHLCV = async function(stock, pair) {
  try {
    var response = await axios.get(`http://api.kupi.network/${stock}/ohlcv/${pair}`)
    return response.data
  } catch (err) { console.log(err) }
}

// exports.getOHLCVCycle = getOHLCVCycle
exports.getOHLCV = getOHLCV
