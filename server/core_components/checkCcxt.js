var {catchHead} = require('../../utils')
const ccxt = require ('ccxt')
const _ = require('lodash')
const serializeError = require('serialize-error')


global.CHECKCCXT = {}
const checkCcxt = async function(names) {
  for (let name of names) {
    // console.log(name)
    var stock = new ccxt[name] ({
      'enableRateLimit': true
    })
    var ratelimit = stock.ratelimit
    await checkPairs(name, ratelimit, stock)

    await checkOrderbooks(name, ratelimit, stock)
    await checkOrderbook(name, ratelimit, stock)
  }
  console.log(global.CHECKCCXT)
}

const checkPairs = async function(name, ratelimit, stock) {
  try {
      await catchHead(ratelimit, name)
      var pairs = await stock.loadMarkets()
      // console.log(pairs['ETH/BTC'])
      var checking = pairs['ETH/BTC']
      
      var haveSymbol = _.isString(checking.symbol)
      var isObject = _.isPlainObject(pairs)
      if (haveSymbol && isObject) {
        global.CHECKCCXT[name] = {
          pairs: 'ok'
        }
      }
      // console.log(_.isString(checking.symbol))
      // // console.log(_.isNumber(checking.symbol))
      // console.log(_.isPlainObject(pairs))

    } catch(err) {
      global.CHECKCCXT[name] = {
        pairs: serializeError(err).message
      }
    }
}

const checkOrderbooks = async function(name, ratelimit, stock) {
  try {
    await catchHead(ratelimit, name)
    var data = await exchange.fetchOrderBooks(['ETH/BTC', 'LTC/BTC'])
  } catch(err) {
    global.CHECKCCXT[name] = {
      orderbooks: serializeError(err).message
    }
  }
}

const checkOrderbook = async function(name, ratelimit, stock) {
  try {
    await catchHead(ratelimit, name)
    var data = await exchange.fetchOrderBook('ETH/BTC')
  } catch(err) {
    global.CHECKCCXT[name] = {
      orderbook: serializeError(err).message
    }
  }
}

exports.checkCcxt = checkCcxt