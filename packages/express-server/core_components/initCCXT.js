const ccxt = require ('ccxt')
const _ = require ('lodash')


const initCCXT = async function(privateKeys) {
  var stocks = _.clone(ccxt.exchanges)
  for (let stock of stocks) {
    if (global.CCXT[`${stock}--public`] === undefined) {
      try {
        global.CCXT[`${stock}--public`] = new ccxt[stock] ({
          'enableRateLimit': true
        })
      } catch(err) {
        console.log(`Can't create ${stock} instance`)
      }
    }
  }

  for (let key of privateKeys) {
    global.ACCOUNTS[key.id] = {
      id: key.id,
      name: key.name,
      parser: key.parser,
      stock: key.stock,
      withdrawLimit: key.withdrawLimit,
      withdrawLimitIn: key.withdrawLimitIn,
      note: key.note
    }
    if (key.parser === 'ccxt') {

      for (let keyType of ['safe', 'notSafe', 'danger']) {
        try {
          var apiKey = key[`${keyType}_apiKey`]
          var secret = key[`${keyType}_secret`]
          if (apiKey !== '' && secret !== '') {
            global.CCXT[`${key.id}--${keyType}`] = new ccxt[key.stock] ({
              'enableRateLimit': true,
              'apiKey': apiKey,
              'secret': secret,
              // 'kupi_keyName': key.name
            })
            global.ACCOUNTS[key.id][`${keyType}`] = `${key.id}--${keyType}`

          }
        } catch(err) { console.log(err) }
      }
    }
  }
}

exports.initCCXT = initCCXT
