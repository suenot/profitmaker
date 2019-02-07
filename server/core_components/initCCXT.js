const ccxt = require ('ccxt')

const initCCXT = async function(privateKeys) {
  for (let key of privateKeys) {
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
              'kupi_keyName': key.name
            })
          }
        } catch(err) { console.log(err) }
      }
    }
  }
}

exports.initCCXT = initCCXT

// OUT
// global.CCXT= {
//   "BINANCE_1--safe": {},
//   "BINANCE_1--notSafe": {},
//   "BINANCE_1--danger": {}
// }
