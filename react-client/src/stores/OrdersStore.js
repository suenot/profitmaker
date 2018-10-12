import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import uuidv1 from 'uuid/v1'

class OrdersStore {
  constructor() {
    const start = () => {
      this.fetchOrders()
    }
    start()
    setInterval(() => {
      if ( this.counter > 0 && (SettingsStore.fetchEnabled.value === "true") ) start()
    }, 1000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  hash = ''
  @observable orders = {
    'asks': [],
    'bids': []
  }

  @action async fetchOrders() {
    axios.get(`${this.serverBackend}/${this.stockLowerCase}/orders/${this.pair}`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)
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
