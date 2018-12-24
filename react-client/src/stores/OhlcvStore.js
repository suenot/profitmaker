import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import _ from 'lodash'

class OhlcvStore {
  constructor() {
    const start = () => {
      // TODO
      // if (this.counters[key] === 0) {
      //   delete this.counters[key]
      //   delete this.ohlcv[key]
      // }
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair, timeframe] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOhlcv(stock, pair, timeframe)
      })

    }
    start()
    setInterval(() => {
      start()
    }, 3000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  // hash = ''
  hashes = {}
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

      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)

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

  counters = {}

  @action count(n, stock, pair, timeframe) {
    var key = `${stock}--${pair}--${timeframe}`
    if (this.ohlcv[key] === undefined) this.ohlcv[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}

const store = window.OhlcvStore = new OhlcvStore()
export default store
