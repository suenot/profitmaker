var sleep = require('../../utils').sleep

const updateTradesRaw = async function(sleep) {
    while (true) {
        await updateTradesRawFromBD()
        await sleep(sleep)
    }
}
const updateTradesRawFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/tradesRaw/`)
      .then((response) => {
          global.TRADESRAW = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updateTradesRaw
