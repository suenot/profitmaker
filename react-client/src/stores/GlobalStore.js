import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

// components
import Pairs from '../core_components/Pairs'

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
  @ignore @observable drawerRightComponent = Pairs
  @ignore @observable drawerRightData = {}
  @action drawerRightToggle() {
    this.drawerRightOpen = !this.drawerRightOpen
  }
  @action drawerRightSet(component) {
    this.drawerRightComponent = component
  }
  // END DRAWERS
}

const store = window.GlobalStore = new GlobalStore()

export default store

const trunk = new AsyncTrunk(store, { storage: localStorage })
trunk.init()

setInterval(() => {
  store.fetchStocks()
  store.fetchPairs()
  trunk.updateStore(store)
}, 1000)


