import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class OpenOrdersStore {
  @observable openOrders = {'BITFINEX': {'XRP/BTC': {}}}
  @action fetchOpenOrders(){
    axios.get('http://localhost:8051/openOrders')
    .then((response) => {
      this.openOrders = response.data
      // console.log('openOrders', this.openOrders)
      // this._free = response.data[this.stock]['free']
      // this._used = response.data[this.stock]['used']
    })
    .catch((error) => { console.log(error) })
  }
}

const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store

autorun(() => {
  store.fetchOpenOrders()
})
