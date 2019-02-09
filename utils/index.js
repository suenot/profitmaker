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
const calculateCoin = function (amount, coin) {
  return { 'btc': parseFloat(global.COINMARKETCAP[coin]['price_btc']) * parseFloat(amount), 'usd': parseFloat(global.COINMARKETCAP[coin]['price_usd']) * parseFloat(amount) }
}
////////////////////
// TRADE UTILS START
////////////////////
const create = async function (stockName, symbol, side, amount, price) {
    // try {
      var rateLimit = global.STOCKS[stockName]['rateLimit']
      await catchHead(rateLimit, stockName)
      return await global.STOCKS[stockName].createOrder(symbol, 'limit', side, amount, price) /// ('BTC/USD', 1, 2500.00)
    // } catch (err) {
    //   console.log('createOrder error')
    //   console.log(err)
    //   return err
    // }
}
// const cancel = async function(stockName, id, symbol){
//     // try {
//     console.log('***')
//       var rateLimit = global.STOCKS[stockName]['rateLimit']
//       await catchHead(rateLimit, stockName)
//       return await global.STOCKS[stockName].cancelOrder(id, symbol)
//     // } catch (err) {
//     //   console.log('Что-то сломалось ', err)
//     // }
// }
// const change = async function(stockName, id, symbol, side, new_price){
//     try {
//       var rateLimit = global.STOCKS[stockName]['rateLimit']
//       await catchHead(rateLimit, stockName)
//       var cancel = await cancel(stockName, id, symbol)
//       if (cancel['Success'] == true){
//         await catchHead(rateLimit, stockName)
//         return await create(stockName, symbol, 'limit', side, amount, price)
//       }
//     } catch (err) {
//         console.log('Что-то сломалось' , err)
//     }
// }
//////////////////
// TRADE UTILS END
//////////////////
exports.sleep = sleep
exports.catchHead = catchHead
exports.calculateCoin = calculateCoin
exports.create = create
// exports.cancel = cancel
// exports.change = change
