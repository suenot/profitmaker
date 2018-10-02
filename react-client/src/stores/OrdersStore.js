import { observable, action, computed } from 'mobx'
import axios from 'axios'
// import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class OrdersStore {

  // @computed get stock() {return GlobalStore.stock }
  // @computed get stockLowerCase() {return GlobalStore.stockLowerCase }
  // @computed get pair() {return GlobalStore.pair }
  @observable stock = 'BINANCE'
  @observable stockLowerCase = 'binance'
  @observable pair = 'ETH_BTC'

  @observable orders = {
    'asks': [],
    'bids': []
  }

  @action async fetchOrders() {
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/orders/${this.pair}`)
    .then((response) => {

      var _orders = response.data
      // for(let ask in _orders.asks) {
      var sumAsks = 0
      for( let [key, order] of Object.entries(_orders.asks) ) {
        var price = order[0]
        var amount = order[1]
        var total = price * amount
        sumAsks = total + sumAsks
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
        var _price = order[0]
        var _amount = order[1]
        var _total = _price * _amount
        sumBids = total + sumBids
        _orders.bids[key] = {
          id: uuidv1(),
          price: _price,
          amount: _amount,
          total: _total,
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
      // console.log(error)
    })
  }
}

// const store = window.OrdersStore = new OrdersStore()
const store = new OrdersStore()

export default store

// var counter = 0

setInterval(() => {
  store.fetchOrders()
  // counter += 1
  // console.log(counter)
  console.log(new Date())
}, 2000)
