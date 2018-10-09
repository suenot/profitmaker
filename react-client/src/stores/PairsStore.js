import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'

class PairsStore {
  constructor() {
    setInterval(async () => {
      await this.fetchPairs()
    }, 1000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }

  @observable pairsFilter = ''

  @observable pairs = []

  @computed get pairsComputed() {
    return this.pairs.filter( (pair) => {
      return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    })
  }

  @action setPairsFilter(_pair) {
    this.pairsFilter = _pair
  }

  @action setPair(_pair) {
    DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].pair = _pair
  }

  @action async fetchPairs() {
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/pairs/`)
    .then((response) => {
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
