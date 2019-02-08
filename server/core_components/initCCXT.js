const ccxt = require ('ccxt')

const initCCXT = async function(privateKeys) {
  for (let key of privateKeys) {
    global.ACOUNTS[key.id] = {
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
              'kupi_keyName': key.name
            })
            global.ACOUNTS[key.id][`${keyType}`] = `${key.id}--${keyType}`

          }
        } catch(err) { console.log(err) }
      }
    }
  }
}

exports.initCCXT = initCCXT
