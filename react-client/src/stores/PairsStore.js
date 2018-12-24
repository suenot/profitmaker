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

  @action async fetchPairs(key) {
    var stockLowerCase = key.toLowerCase()
    axios.get(`${this.serverBackend}/${stockLowerCase}/pairs/`)
    .then((response) => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)
      var pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
      this.pairs[key] = pairs
    })
    .catch((err) => {
      this.pairs[key] = []
    })
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
