import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import _ from 'lodash'

class OhlcvStore {
  constructor() {
    const start = (stock, pair, timeframe) => {
      this.fetchOhlcv(stock, pair, timeframe)
    }
    // start(timeframe) // TODO: Don't know timeframe at this moment
    setInterval(() => {
      console.log('interval')
      console.log(this.activeTimeframes)
      _.forEach(this.activeTimeframes, (counter, key) => {
        var [stock, pair, timeframe] = key.split('--')
        console.log(stock, pair, timeframe, counter)
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) start(stock, pair, timeframe)
      })
    }, 2000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  hash = ''
  // @observable ohlcv = []
  @observable ohlcv = {
    // 'stock--pair--timeframe': []
    'LIQUI--ETH_BTC--1m': [],
    'LIQUI--ETH_BTC--15m': []
  }

  @computed get ohlcvComputed() {
    // if ( JSON.stringify(this.ohlcv) !== '[]' ) {
    var ohlcv = _.clone(this.ohlcv)
    // _.forEach(ohlcv, (value) => {
    // for (let value of Object.values(ohlcv)) {
    for (const [key, value] of Object.entries(ohlcv)) {
    // for (let i=0; i<value of Object.values(ohlcv)) {
      ohlcv[key] = value.map((item) => {
        return {
          'date': new Date(item[0]),
          'open': item[1],
          'high': item[2],
          'low': item[3],
          'close': item[4],
          'volume': item[5],
          'absoluteChange': '',
          'dividend': '',
          'percentChange': '',
          'split': '',
        }
      })
    }
    console.log('COMPUTED')
    console.log(ohlcv)
    return ohlcv
    // console.log()

    // return this.ohlcv.map((item) => {
    //   return {
    //     'date': new Date(item[0]),
    //     'open': item[1],
    //     'high': item[2],
    //     'low': item[3],
    //     'close': item[4],
    //     'volume': item[5],
    //     'absoluteChange': '',
    //     'dividend': '',
    //     'percentChange': '',
    //     'split': '',
    //   }
    // })
    // } else {
    //   return []
    // }
  }

  @action async fetchOhlcv(stock, pair, timeframe) {
    var stockLowerCase = stock.toLowerCase()
    axios.get(`${this.serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)

      if (!response.data) {
        // this.ohlcv = []
        this.ohlcv[`${stock}--${pair}--${timeframe}`] = []
      } else {
        this.ohlcv[`${stock}--${pair}--${timeframe}`] = response.data
        // this.ohlcv = response.data
      }
    })
    .catch((error) => {
      this.ohlcv = []
    })
  }

  activeTimeframes = {}
  @action count(n, stock, pair, timeframe) {
    console.log('count')
    var stock = stock !== '' ? stock : this.stock
    var pair = pair !== '' ? pair : this.pair
    if (!this.activeTimeframes[`${stock}--${pair}--${timeframe}`]) this.activeTimeframes[`${stock}--${pair}--${timeframe}`] = 0
    if (!this.ohlcv[`${stock}--${pair}--${timeframe}`]) this.ohlcv[`${stock}--${pair}--${timeframe}`] = []
    this.activeTimeframes[`${stock}--${pair}--${timeframe}`] += n

    // if (this.activeTimeframes[`${stock}--${pair}--${timeframe}`] === 0) {
    //   delete this.activeTimeframes[`${stock}--${pair}--${timeframe}`]
    // }
  }
}

const store = window.OhlcvStore = new OhlcvStore()
export default store
