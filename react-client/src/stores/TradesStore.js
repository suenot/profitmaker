import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class TradesStore {
  constructor() {
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchTrades(stock, pair)
      })
    }
    start()
    setInterval(() => {
      start()
    }, 5000)
    // const start = () => {
    //   this.fetchTrades()
    // }
    // start()
    // setInterval(() => {
    //   if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    // }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  hashes = {}
  @observable trades = {} // []

  @action fetchTrades(stock, pair){
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}`
    axios.get(`${this.serverBackend}/${stockLowerCase}/trades/${this.pair}`)
    .then((response) => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)
      var trades = _.orderBy(response.data.slice(0, 20), ['timestamp'], ['desc'])
      this.trades[key] = trades
    })
    .catch(() => {
      this.trades[key] = []
    })
  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.trades[key] === undefined) this.trades[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
  }
}

const store = window.TradesStore = new TradesStore()

export default store
