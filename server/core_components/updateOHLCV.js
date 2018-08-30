var sleep = require('../../utils').sleep

const updateOHLCV = async function(sleep) {
    while (true) {
        await updateOHLCVFromBD()
        await sleep(sleep)
    }
}
const updateOHLCVFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/ohlcv/`)
      .then((response) => {
          global.OHLCV = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updateOHLCV
