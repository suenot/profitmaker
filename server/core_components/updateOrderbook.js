var sleep = require('../../utils').sleep

const updateOrderbook = async function(sleep) {
    while (true) {
        await updateOrderbookFromBD()
        await sleep(sleep)
    }
}
const updateOrderbookFromBD = async function() {
    try {

      axios.get(`http://144.76.109.194:8051/orders/`)
      .then((response) => {
          global.ORDERBOOK = response.data
      })
      .catch((error) => { console.log(error) })
    } catch (err) { console.log(err) }
}

module.exports = updateOrderbook
