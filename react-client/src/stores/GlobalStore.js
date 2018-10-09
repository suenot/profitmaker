// import { version, AsyncTrunk, ignore } from 'mobx-sync'
// import { observable, action, computed } from 'mobx'
// import axios from 'axios'
// import _ from 'lodash'

// components
// import Settings from '../core_components/Settings












// import StocksStore from './StocksStore'
// import PairsStore from './PairsStore'
// import DrawersStore from './DrawersStore'
// import SettingsStore from './SettingsStore'
// import DashboardsStore from './DashboardsStore'

// class GlobalStore {
//   constructor() {
//     this.StocksStore = new StocksStore(this)
//     this.PairsStore = new PairsStore(this)
//     this.DrawersStore = new DrawersStore(this)
//     this.SettingsStore = new SettingsStore(this)
//     this.DashboardsStore = new DashboardsStore(this)
//   }
// }

// const store = window.GlobalStore = new GlobalStore()

// export default store












// const trunk = new AsyncTrunk(store, { storage: localStorage, storageKey: 'global' })
// trunk.init()

// setInterval(async () => {
//   await store.fetchStocks()
//   await store.fetchPairs()
//   await trunk.updateStore(store)
// }, 1000)

