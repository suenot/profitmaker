let sleep = (ms) => new Promise (resolve => setTimeout (resolve, ms))
global.sleepUntil = {}
global.sleepUntilPrioriy = {}
const catchHead = async function(rateLimit, stock, priority) {
    while (true) {

      if (priority == 1) {
        if ( global.sleepUntilPrioriy[stock] == undefined ) {
            sleepUntilPrioriy[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else if ( sleepUntilPrioriy[stock] < new Date() ) {
            global.sleepUntilPrioriy[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else {
            await sleep(100) // выполняют тупую работу (майнят)
        }

      } else {
        if ( global.sleepUntil[stock] == undefined ) {
            sleepUntil[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else if ( sleepUntil[stock] < new Date() ) {
            global.sleepUntil[stock] = new Date(Date.now() + rateLimit + 500)
            break
        } else {
            await sleep(100)
        }
      }

    }
}

const main = async function() {
  while (true) {
    await catchHead(100, 'orders', 0)
    console.log('orders')
  }
  while (true) {
    await catchHead(1000, 'BUY', 1)
    console.log('BUY')
  }
}
main()
