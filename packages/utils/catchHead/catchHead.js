var {sleep} = require('@kupi/sleep')

const catchHead = async function(rateLimit, stock) {
  // console.log('CH Start')
  // console.log(rateLimit, stock)
  if (rateLimit === undefined) rateLimit = 3000
  while (true) {
    if ( global.sleepUntil[stock] == undefined ) {

      global.sleepUntil[stock] = Date.now() + rateLimit + 500
      // console.log(global.sleepUntil[stock])
      break
    } else if ( global.sleepUntil[stock] < new Date() ) {
      global.sleepUntil[stock] = Date.now() + rateLimit + 500
      // console.log(global.sleepUntil[stock])
      break
    } else {
      await sleep(200)
    }
  }
  // console.log('CH End')
}

exports.catchHead = catchHead
