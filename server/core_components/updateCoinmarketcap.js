var sleep = require('../../utils').sleep

const updateCoinmarketcap = async function(sleep) {
    while (true) {
        await updateCoinmarketcapFromBD()
        await sleep(sleep)
    }
}
const updateCoinmarketcapFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/coinmarketcap/`)
      .then((response) => {
          global.COINMARKETCAP = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updateCoinmarketcap
