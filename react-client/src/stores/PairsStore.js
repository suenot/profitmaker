import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class PairsStore {
  constructor() {
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchPairs(key)
      })
    }
    setTimeout(() => {
      start()
    }, 200)
    setInterval(() => {
      start()
    }, 30000)

    // this.fetchPairs()
    // setInterval(async () => {
    //   await this.fetchPairs()
    // }, 1000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  // @observable pairsFilter = ''
  @observable pairsFilters = {}

  // hash = ''
  // @observable pairs = []
  hashes = {}
  @observable pairs = {}

  @computed get pairsComputed() {
    console.log()
    var pairs = _.clone(this.pairs)
    for (const [key, value] of Object.entries(pairs)) {
      pairs[key] = value.filter( (pair) => {
        if (this.pairsFilters[key] === undefined) this.pairsFilters[key] = ''
        return pair.toLowerCase().indexOf( this.pairsFilters[key].toLowerCase() ) !== -1
      })
    }
    return pairs

    // return this.pairs.filter( (pair) => {
    //   return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    // })
  }

  @action setPairsFilter(pair, stock) {
    // this.pairsFilter = _pair
    this.pairsFilters[stock] = pair
  }

  @action setPair(pair) {
    DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].pair = pair
  }

  @action async fetchPairs(stock) {
    console.log('fetch')
    var stockLowerCase = stock.toLowerCase()
    // var [stock, pair, timeframe] = key.split('--')
    axios.get(`${this.serverBackend}/${stockLowerCase}/pairs/`)
    .then((response) => {
      // if (this.hash === JSON.stringify(response.data)) {
      //   return true
      // }
      // this.hash = JSON.stringify(response.data)
      var pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
      this.pairs[stock] = pairs
    })
    .catch((error) => {
      this.pairs[stock] = []
      console.log(error) })
  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}`
    if (this.pairs[key] === undefined) this.pairs[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n

  }

}

const store = window.PairsStore = new PairsStore()
export default store
