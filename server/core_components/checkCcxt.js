var {catchHead} = require('../../utils')
const ccxt = require ('ccxt')
const _ = require('lodash')
const serializeError = require('serialize-error')


global.CHECKCCXT = {} // object for result
global.CHECKSTOCK = {} // object for init stocks
global.CHECKSYMBOLS = {} // symbols for test
const checkCcxt = async function() {
  // console.log('checkSTART')
  // console.log(ccxt.exchanges)
  // var names = ['binance']
  var names = ccxt.exchanges

  try {
    for (let name of names) {
      global.CHECKSTOCK[name] = new ccxt[name] ({
        'enableRateLimit': true
      })
      global.CHECKCCXT[name] = {
        stock: name
      }
    }
  } catch (err) { console.log(err) }

  await Promise.all(names.map(checkStock))
  // console.log(global.CHECKCCXT)
  // console.log('checkEND')
}

const checkStock = async function(name) {
  try {
    await checkPairs(name)
    // console.log(global.CHECKSTOCK[name].rateLimit)
    await catchHead(global.CHECKSTOCK[name].rateLimit, name)
    await checkOrderbook(name)
    await catchHead(global.CHECKSTOCK[name].rateLimit, name)
    await checkOrderbooks(name)
    await catchHead(global.CHECKSTOCK[name].rateLimit, name)
    await checkOHLCV(name)
    await catchHead(global.CHECKSTOCK[name].rateLimit, name)
    await checkTrades(name)
  } catch (err) { console.log(err) }
}

const checkPairs = async function(name) {
  try {
      var pairs = await global.CHECKSTOCK[name].loadMarkets()
      var symbols = []
      for (var key in pairs) {
        var symbol = pairs[key]['symbol']
        symbols.push(symbol)
      }
      global.CHECKSYMBOLS[name] = {
        symbols: symbols
      }
      var checking = pairs[global.CHECKSYMBOLS[name].symbols[0]]
      var haveSymbol = _.isString(checking.symbol)
      var isObject = _.isPlainObject(pairs)
      if (haveSymbol && isObject) {
        global.CHECKCCXT[name]['pairs'] = 'ok'
      } else {
        global.CHECKCCXT[name]['pairs'] = 'ok, but strange shema'
      }
    } catch(err) {
      global.CHECKCCXT[name]['pairs'] = serializeError(err).message
    }
}

const checkOrderbooks = async function(name) {
  // console.log('++++')
  // console.log(global.CHECKSTOCK[name].has.fetchOrderBooks)
  try {
    if (global.CHECKSTOCK[name].has.fetchOrderBooks) {
      var data = await global.CHECKSTOCK[name].fetchOrderBooks([global.CHECKSYMBOLS[name].symbols[0], global.CHECKSYMBOLS[name].symbols[1]])
      // console.log(data)
      var checkCase = data[global.CHECKSYMBOLS[name].symbols[0]]
      var isObject = _.isPlainObject(checkCase)
      var isArray = _.isArray(checkCase.bids)
      var isNumber = _.isNumber(checkCase.bids[0][0])
      if (isObject && isArray && isNumber) {
        global.CHECKCCXT[name]['orderbooks'] = 'ok'
      } else {
        global.CHECKCCXT[name]['orderbooks'] = 'ok, but strange shema'
      }
    } else {
      global.CHECKCCXT[name]['orderbooks'] = 'mass orders not available'
    }
  } catch(err) {
    global.CHECKCCXT[name]['orderbooks'] = serializeError(err).message
  }

}

const checkOrderbook = async function(name) {
  // console.log('+-+-+-+')
  try {
    var data = await global.CHECKSTOCK[name].fetchOrderBook(global.CHECKSYMBOLS[name].symbols[0])
    // console.log(data)
    var isObject = _.isPlainObject(data)
    var isArray = _.isArray(data.bids)
    var isNumber = _.isNumber(data.bids[0][0])
    if (isObject && isArray && isNumber) {
      global.CHECKCCXT[name]['orderbook'] = 'ok'
    } else {
      global.CHECKCCXT[name]['orderbook'] = 'ok, but strange shema'
    }
  } catch(err) {
    global.CHECKCCXT[name]['orderbook'] = serializeError(err).message
  }
}

const checkOHLCV = async function(name){
  // console.log('*-*-*-*')
  try {
    if (global.CHECKSTOCK[name].has.fetchOHLCV) {

      var data = await global.CHECKSTOCK[name].fetchOHLCV(global.CHECKSYMBOLS[name].symbols[0], '1m')
      var isArray = _.isArray(data)
      var isArrayInner = _.isArray(data[0])
      var isNumber = _.isNumber(data[0][0])
      if (isArray && isArrayInner && isNumber) {
        global.CHECKCCXT[name]['ohlcv'] = 'ok'
      } else {
        global.CHECKCCXT[name]['ohlcv'] = 'ok, but strange shema'
      }
    } else {
      global.CHECKCCXT[name]['ohlcv'] = 'ohlcv not available'
    }
  } catch(err) {
    global.CHECKCCXT[name]['ohlcv'] = serializeError(err).message
  }
}

const checkTrades = async function(name) {
  // console.log('/-/-/-/')
  try {
    if (global.CHECKSTOCK[name].has['fetchTrades']) {
      var data = await global.CHECKSTOCK[name].fetchTrades (global.CHECKSYMBOLS[name].symbols[0])
      var isArray = _.isArray(data)
      var isObject = _.isPlainObject(data[0])
      var havePrice = _.isNumber(data[0].price)
      var haveSide = _.isString(data[0].side)
      var haveAmount = _.isNumber(data[0].amount)
      if (isArray && isObject && havePrice && haveSide && haveAmount) {
        global.CHECKCCXT[name]['trades'] = 'ok'
      } else {
        global.CHECKCCXT[name]['trades'] = 'ok, but strange shema'
      }
    }
  } catch(err) {
    global.CHECKCCXT[name]['trades'] = serializeError(err).message
  }
}

exports.checkCcxt = checkCcxt
