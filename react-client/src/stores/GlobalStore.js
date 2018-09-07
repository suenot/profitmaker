// import { version, AsyncTrunk, ignore } from './mobx-sync/src/index.ts'
// import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, autorun, computed } from 'mobx'
import axios from 'axios'


// components
// import Crocodile from '../core_components/charts/Crocodile'
import Pairs from '../core_components/Pairs'

// @version(1)
class GlobalStore {
  // constructor() {
  //   const trunk = new SyncTrunk(this, { storage: sessionStorage })
  //   trunk.init()
  // }
  // START STOCKS
  @observable stock = 'LIQUI'
  // static stock = sessionStored('stock', 'LIQUI')

  @observable stocks = {}

  @action setStock(stock) {
    console.log('SET STOCK')
    this.stock = stock
  }

  @action async fetchStocks() {
    axios.get('http://localhost:8051/stocks')
    .then((response) => {
      this.stocks = response.data
    })
    .catch((error) => {
      this.stocks = {}
      console.log(error)
    })
  }
  // END STOCKS

  // START PAIRS
  @observable pair = 'ETH_BTC'
  @computed get base() {
    return this.pair.split('_')[0]
  }
  @computed get quote() {
    return this.pair.split('_')[1]
  }

  @observable pairs = []

  @action setPair(_pair) {
    console.log('SET PAIR')
    this.pair = _pair
  }

  @action async fetchPairs() {
    axios.get(`http://localhost:8051/pairs/${this.stock}`)
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
  @observable drawerRightOpen = false
  @observable drawerRightComponent = Pairs
  @observable drawerRightData = {}
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

// const trunk = new AsyncTrunk(store, { storage: localStorage })
// trunk.init().then(() => {
//   // trunk.getItem
//   // console.log('***********')
//   // do any staff as you wanted with loaded store
//   // console.log(store.user.model.foo)
// })

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchStocks()
  store.fetchPairs()
  // trunk.updateStore(store)
})


