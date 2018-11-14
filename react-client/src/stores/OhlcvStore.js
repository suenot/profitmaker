import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import _ from 'lodash'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  hash = ''
  @observable ohlcv = {
    // 'stock--pair--timeframe': []
  }

  @computed get ohlcvComputed() {
    var ohlcv = _.clone(this.ohlcv)
    for (const [key, value] of Object.entries(ohlcv)) {
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
    return ohlcv
  }

  @action async fetchOhlcv(stock, pair, timeframe) {
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}--${timeframe}`
    axios.get(`${this.serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      // if (this.hash === JSON.stringify(response.data)) return true
      // this.hash = JSON.stringify(response.data)

      if (!response.data) {
        this.ohlcv[key] = []
      } else {
        this.ohlcv[key] = response.data
      }
    })
    .catch((error) => {
      this.ohlcv[key] = []
    })
  }

  activeTimeframes = {}

  @action count(n, stock, pair, timeframe) {
    console.log('count')
    stock = stock !== '' ? stock : this.stock
    pair = pair !== '' ? pair : this.pair
    var key = `${stock}--${pair}--${timeframe}`
    if (!this.ohlcv[key]) this.ohlcv[key] = []
    if (!this.activeTimeframes[key]) this.activeTimeframes[key] = 0
    // if (this.activeTimeframes[key] === 0) {
    //   await sleep(2000)
    // }
    // window.dispatchEvent(new Event('resize'))
    this.activeTimeframes[key] += n
    console.log('count', `${stock}--${pair}--${timeframe}`, this.activeTimeframes[`${stock}--${pair}--${timeframe}`])

    if (this.activeTimeframes[key] === 0) {
      delete this.activeTimeframes[key]
    }
  }
}

const store = window.OhlcvStore = new OhlcvStore()
export default store
