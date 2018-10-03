import { observable, action, computed } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class OrdersStore {
  constructor() {
    const start = () => {
      this.fetchOrders()
    }
    start()
    setInterval(() => {
      if (this.counter > 0) start()
    }, 2000)
  }
  @computed get stock() {return GlobalStore.stock }
  @computed get stockLowerCase() {return GlobalStore.stockLowerCase }
  @computed get pair() {return GlobalStore.pair }

  @observable orders = {
    'asks': [],
    'bids': []
  }

  @action async fetchOrders() {
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/orders/${this.pair}`)
    .then((response) => {
      var _orders = response.data
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
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.OrdersStore = new OrdersStore()

export default store
