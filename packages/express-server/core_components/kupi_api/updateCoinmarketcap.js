var {sleep} = require('@kupi/sleep')
const axios = require('axios')

const updateCoinmarketcapCycle = async function(timeout) {
    while (true) {
        await updateCoinmarketcap()
        await sleep(timeout)
    }
}
const updateCoinmarketcap = async function() {
    try {
        var response = await axios.get(`http://api.kupi.network/coinmarketcap/`)
        global.COINMARKETCAP = response.data
        return response.data
    } catch (err) { console.log(err) }
}

exports.updateCoinmarketcapCycle = updateCoinmarketcapCycle
exports.updateCoinmarketcap = updateCoinmarketcap
