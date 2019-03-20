import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class TradesStore {
  constructor() {
    this.start()
    this.interval = setInterval(() => {
      this.start()
    }, 5000)
  }

  @action start() {
    _.forEach(this.counters, (counter, key) => {
      var [stock, pair] = key.split('--')
      if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchTrades(stock, pair)
    })
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  interval = ''
  tubes = {}
  hashes = {}
  @observable trades = {} // []

  @action async fetchTrades_kupi(stockLowerCase, pair, key) {
    return axios.get(`${this.serverBackend}/${stockLowerCase}/trades/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.tubes[key] = 'ccxt'
      return []
    })
  }

  @action async fetchTrades_ccxt(stockLowerCase, pair) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/trades/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  @action async fetchTrades(stock, pair){
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}`

    var data
    if (this.tubes[key] === 'ccxt') {
      data = await this.fetchTrades_ccxt(stockLowerCase, pair)
    } else {
      data = await this.fetchTrades_kupi(stockLowerCase, pair, key)
    }

    if (this.hashes[key] === JSON.stringify(data)) return true
    this.hashes[key] = JSON.stringify(data)

    this.trades[key] = _.orderBy(data, ['timestamp'], ['desc'])
  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.trades[key] === undefined) this.trades[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}

const store = window.TradesStore = new TradesStore()

export default store
