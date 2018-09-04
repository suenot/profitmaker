import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'

class OpenOrdersStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }


  @observable openOrders = {'LIQUI': {'DNT/BTC': {}}}
  @action fetchOpenOrders(){
    axios.get('http://localhost:8051/openOrders')
    .then((response) => {
      this.openOrders = response.data
    })
    .catch((error) => { console.log(error) })
  }
}

const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchOpenOrders()
})
