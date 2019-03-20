import { observable, action, computed } from 'mobx'
import axios from 'axios'
// import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class PairsStore {
  constructor() {
    const start = () => {
      _.forEach(this.counters, (counter, stock) => {
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchPairs(stock)
      })
    }
    start()
    setInterval(() => {
      start()
    }, 1000)
  }
  // @computed get stock() {return DashboardsStore.stock }
  // @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  @observable pairsFilter = ''

  hashes = {}
  tubes = {}
  @observable pairs = {}

  @computed get pairsComputed() {
    var pairs = _.cloneDeep(this.pairs)
    for (const [key, value] of Object.entries(pairs)) {
      pairs[key] = pairs[key].filter( (pair) => {
        return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
      })
    }
    return pairs
    // return this.pairs.filter( (pair) => {
    //   return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    // })
  }

  @action setPairsFilter(_pair) {
    this.pairsFilter = _pair
  }

  // @action setPair(pair) {
  //   DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].pair = pair
  //   DashboardsStore.setWidgetsData('pair', pair)
  // }

  @action async fetchPairs_kupi(stockLowerCase, key) {
    return axios.get(`${this.serverBackend}/${stockLowerCase}/pairs/`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.tubes[key] = 'ccxt'
      return []
    })
  }

  @action async fetchPairs_ccxt(stockLowerCase) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/pairs/`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  @action async fetchPairs(key) {
    var stockLowerCase = key.toLowerCase()
    var data
    if (this.tubes[key] === 'ccxt') {
      data = await this.fetchPairs_ccxt(stockLowerCase)
    } else {
      data = await this.fetchPairs_kupi(stockLowerCase, key)
    }
    if (this.hashes[key] === JSON.stringify(data)) return true
    this.hashes[key] = JSON.stringify(data)
    var pairs = data.map((pair) => {
      return pair.split('/').join('_')
    })
    this.pairs[key] = pairs
  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}`
    if (this.pairs[key] === undefined) this.pairs[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}

const store = window.PairsStore = new PairsStore()
export default store
