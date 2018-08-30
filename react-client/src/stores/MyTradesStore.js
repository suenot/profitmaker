import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class MyTradesStore {
  @observable myTrades = {'BITFINEX': {'XRP/BTC': {}}}
  @action fetchMyTrades(){
    axios.get('http://localhost:8051/myTrades')
    .then((response) => {
      this.myTrades = response.data
      // console.log('openOrders', this.openOrders)
      // this._free = response.data[this.stock]['free']
      // this._used = response.data[this.stock]['used']
    })
    .catch((error) => { console.log(error) })
  }
}

const store = window.MyTradesStore = new MyTradesStore()

export default store

autorun(() => {
  store.fetchMyTrades()
})
