import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class PairsStore {
  constructor() {
    this.fetchPairs()
    setInterval(async () => {
      await this.fetchPairs()
    }, 1000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  @observable pairsFilter = ''

  hash = ''
  @observable pairs = []

  @computed get pairsComputed() {
    return this.pairs.filter( (pair) => {
      return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    })
  }

  @action setPairsFilter(_pair) {
    this.pairsFilter = _pair
  }

  // @action setPair(pair) {
  //   DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].pair = pair
  //   DashboardsStore.setWidgetsData('pair', pair)
  // }

  @action async fetchPairs() {
    // TODO
    axios.get(`${this.serverBackend}/${this.stockLowerCase}/pairs/`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) {
        return true
      }
      this.hash = JSON.stringify(response.data)
      var pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
      this.pairs = pairs
    })
    .catch((error) => {
      this.pairs = []
      console.log(error) })
  }
}

const store = window.PairsStore = new PairsStore()
export default store
