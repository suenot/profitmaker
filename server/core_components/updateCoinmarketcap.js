var sleep = require('../../utils/utils').sleep

const updateCoinmarketcap = async function(db) {
    while (true) {
        await updateCoinmarketcapFromBD(db)
        await sleep(10000)
    }
}
const updateCoinmarketcapFromBD = async function(db) {
    try {
        cursor = await db.collection('coinmarketcap').find().toArray()
        for (var document of cursor) {
            if ( global.COINMARKETCAP === undefined ) global.COINMARKETCAP = {}
            global.COINMARKETCAP[document['symbol']] = {
                'price_usd': document['price_usd'],
                'price_btc': document['price_btc']
            }
        }
        console.log('coinmarketcap')
    } catch (err) { console.log(err) }
}

module.exports = updateCoinmarketcap
