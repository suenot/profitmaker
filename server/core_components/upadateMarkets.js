var sleep = require('../../utils').sleep

const updateMarkets = async function(sleep) {
    while (true) {
        await updateMarketsFromBD()
        await sleep(sleep)
    }
}
const updateMarketsFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/stocks/`)
      .then((response) => {
          global.MARKETS = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updateMarkets
