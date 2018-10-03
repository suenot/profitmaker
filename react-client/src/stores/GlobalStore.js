import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

// components
import Settings from '../core_components/Settings'

@version(1)
class GlobalStore {

  @observable stock = 'BINANCE'
  @computed get stockLowerCase() {
    return this.stock.toLowerCase()
  }

  @ignore @observable stocks = []
  @ignore @observable stocksFilter = ''

  @action setStocksFilter(_stock) {
    this.stocksFilter = _stock
  }

  @computed get stocksComputed() {
    return this.stocks.filter((stock) => {
      return stock.name.toLowerCase().indexOf( this.stocksFilter.toLowerCase() ) !== -1
    })
  }


  @action setStock(stock) {
    this.stock = stock
  }

  @action async fetchStocks() {
    axios.get('http://api.kupi.network:8051/stocks')
    .then((response) => {
      this.stocks = _.toArray(response.data)
    })
    .catch((error) => {
      this.stocks = []
      console.log(error)
    })
  }

  // END STOCKS

  // START PAIRS
  @observable pair = 'ETH_BTC'
  @ignore @observable pairsFilter = ''
  @computed get base() {
    return this.pair.split('_')[0]
  }
  @computed get quote() {
    return this.pair.split('_')[1]
  }

  @ignore @observable pairs = []

  @computed get pairsComputed() {
    return this.pairs.filter( (pair) => {
      return pair.toLowerCase().indexOf( this.pairsFilter.toLowerCase() ) !== -1
    })
  }

  @action setPairsFilter(_pair) {
    this.pairsFilter = _pair
  }



  @action setPair(_pair) {
    this.pair = _pair
  }

  @action async fetchPairs() {
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/pairs/`)
    .then((response) => {
      this.pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
    })
    .catch((error) => {
      this.pairs = []
      console.log(error) })
  }
  // END PAIRS

  // START DRAWERS
  @ignore @observable drawerRightOpen = false
  @ignore @observable drawerRightComponent = Settings
  @ignore @observable drawerRightData = {}
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component) {
    this.drawerRightComponent = component
  }
  // END DRAWERS

  // START SETTINGS
  @observable serverBackend = {
    name: 'Server backend',
    value: 'http://api.kupi.network/'
  }
  @observable terminalBackend = {
    name: 'Server backend',
    value: 'http://localhost:8051/'
  }
  @observable fetchEnabled = {
    name: 'Fetch enabled',
    value: 'true'
  }
  @observable defaultSetInterval = {
    name: 'Fetch interval',
    value: '2000'
  }
  // END SETTINGS
}

const store = window.GlobalStore = new GlobalStore()

const trunk = new AsyncTrunk(store, { storage: localStorage, storageKey: 'global' })
trunk.init()

setInterval(async () => {
  await store.fetchStocks()
  await store.fetchPairs()
  await trunk.updateStore(store)
}, 1000)

export default store
