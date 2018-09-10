import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class OrdersStore {

  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }

  @observable orders = {
    'asks': [],
    'bids': []
  }

  @action async fetchOrders() {
    axios.get(`http://localhost:8051/orders/${this.stock}/${this.pair}`)
    .then((response) => {
      var _orders = response.data
      // for(let ask in _orders.asks) {
      var sumAsks = 0
      for( let [key, order] of Object.entries(_orders.asks) ) {
        var price = order[0]
        var amount = order[1]
        var total = price * amount
        var sumAsks = total + sumAsks
        _orders.asks[key] = {
          id: uuidv1(),
          price: price,
          amount: amount,
          total: total,
          sum: sumAsks
        }
      }
      // for(var bid of _orders.bids) {
      var sumBids = 0
      for( let [key, order] of Object.entries(_orders.bids) ) {
        var price = order[0]
        var amount = order[1]
        var total = price * amount
        var sumBids = total + sumBids
        _orders.bids[key] = {
          id: uuidv1(),
          price: price,
          amount: amount,
          total: total,
          sum: sumBids
        }
      }
      this.orders = _orders
    })
    .catch((error) => {
      this.orders = {
        'asks': [],
        'bids': []
      }
      console.log(error)
    })
  }
}

const store = window.OrdersStore = new OrdersStore()

export default store

autorun(
  () => {
    console.log(store.stock)
    console.log(store.pair)
    store.fetchOrders()
  }
)

autorun(() => {
  store.fetchOrders()
})
