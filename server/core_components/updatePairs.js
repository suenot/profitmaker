var sleep = require('../../utils').sleep

const updatePairs = async function(sleep) {
    while (true) {
        await updatePairsFromBD()
        await sleep(sleep)
    }
}
const updatePairsFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/pairs/`)
      .then((response) => {
          global.PAIRS = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updatePairs
