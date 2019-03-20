import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import template from 'es6-template-strings'
import _ from 'lodash'

class OhlcvStore {
  constructor() {
    this.start()
    this.interval = setInterval(() => {
      this.start()
    }, 5000)
  }

  @action start() {
    // TODO
    // if (this.counters[key] === 0) {
    //   delete this.counters[key]
    //   delete this.ohlcv[key]
    // }
    _.forEach(this.counters, (counter, key) => {
      if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOhlcv(key)
    })
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  interval = ''
  tubes = {}
  hashes = {}
  @observable ohlcv = {
    // 'stock--pair--timeframe-url': []
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

  @action async fetchOhlcv_kupi(stockLowerCase, pair, timeframe, key) {
    return axios.get(`${this.serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.tubes[key] = 'ccxt'
      return []
    })
  }

  @action async fetchOhlcv_ccxt(stockLowerCase, pair, timeframe) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  @action async fetchOhlcv(key) {
    var [stock, pair, timeframe, url] = key.split('--')
    var stockLowerCase = stock.toLowerCase()

    var data
    if (this.tubes[key] === 'ccxt') {
      data = await this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe)
    } else {
      data = await this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe, key)
    }

    if (this.hashes[key] === JSON.stringify(data)) return true
    this.hashes[key] = JSON.stringify(data)

    if (!data) {
      this.ohlcv[key] = []
    } else {
      this.ohlcv[key] = data
    }
  }

  counters = {}

  @action count(n, key) {
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
