let sleep = (ms) => new Promise (resolve => setTimeout (resolve, ms))

const catchHead = async function(rateLimit, stock) {
    while (true) {

        if ( global.sleepUntil[stock] == undefined ) {
            global.sleepUntil[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else if ( global.sleepUntil[stock] < new Date() ) {
            global.sleepUntil[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else {
            await sleep(100)
        }
    }
}
const calculateCoin = async function (amount, coin) {
    try {
        return total = {
            "btc": global.COINMARKETCAP[coin]['price_btc'] * amount,
            "usd": global.COINMARKETCAP[coin]['price_usd'] * amount
        }
    } catch (err) {
        return { "btc": 0, "usd": 0 }
    }
}

exports.sleep = sleep
exports.catchHead = catchHead
exports.calculateCoin = calculateCoin
