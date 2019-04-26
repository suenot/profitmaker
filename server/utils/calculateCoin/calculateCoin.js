const calculateCoin = async function (amount, coin) {
  try {
    return { 'btc': parseFloat(global.COINMARKETCAP[coin]['price_btc']) * parseFloat(amount), 'usd': parseFloat(global.COINMARKETCAP[coin]['price_usd']) * parseFloat(amount) }
  } catch (err) {
    // console.log('calculateCoin - COINMARKETCAP error ', coin)
    return {'btc': 0, 'usd': 0}
  }
}

exports.calculateCoin = calculateCoin
