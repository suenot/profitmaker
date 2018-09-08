// import { version, AsyncTrunk, ignore } from './mobx-sync/src/index.ts'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, autorun, computed } from 'mobx'
import axios from 'axios'
import localforage from 'localforage'


// components
// import Crocodile from '../core_components/charts/Crocodile'
import Pairs from '../core_components/Pairs'

@version(1)
class GlobalStore {
  // constructor() {
  //   const trunk = new SyncTrunk(this, { storage: sessionStorage })
  //   trunk.init()
  // }
  // START STOCKS
  @observable stock = 'LIQUI'
  // @observable stock = ( await localforage.getItem('stock') ) || 'LIQUI'
  // stockIsSet = false
  // @observable stock = 'LIQUI'
  // static stock = sessionStored('stock', 'LIQUI')

  @ignore @observable stocks = {}

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
  // async function() {
  //   return (await localforage.getItem('pair') || 'ETH_BTC')
  // }
  // pairIsSet = false
  @computed get base() {
    return this.pair.split('_')[0]
  }
  @computed get quote() {
    return this.pair.split('_')[1]
  }

  @ignore @observable pairs = []

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

// localforage.getItem('stock').then(function (value) {
//   if (value) store.setStock(value)
//   else store.setStock('LIQUI')
// })
// localforage.getItem('pair').then(function (value) {
//   if (value) store.setPair(value)
//   else store.setPair('ETH_BTC')
// })

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  // localforage.setItem('stock', store.stock)
  // localforage.setItem('pair', store.pair)
  store.fetchStocks()
  store.fetchPairs()
  trunk.updateStore(store)

})


