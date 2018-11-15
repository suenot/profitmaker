import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import uuidv1 from 'uuid/v1'
import _ from 'lodash'

class OrdersStore {
  constructor() {
    const start = () => {
      // TODO
      // if (this.counters[key] === 0) {
      //   delete this.counters[key]
      //   delete this.ohlcv[key]
      // }
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOrders(stock, pair)
      })
    }
    start()
    setInterval(() => {
      start()
    }, 1000)
    // const start = () => {
    //   this.fetchOrders()
    // }
    // start()
    // setInterval(() => {
    //   if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    // }, 1000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  // hash = ''
  // @observable orders = {
  //   'asks': [],
  //   'bids': []
  // }
  hashes = {}
  @observable orders = {}

  @action async fetchOrders(stock, pair) {
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}`
    axios.get(`${this.serverBackend}/${stockLowerCase}/orders/${pair}`)
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
      this.orders[key] = _orders
    })
    .catch((error) => {
      this.orders[key] = {
        'asks': [],
        'bids': []
      }
    })
  }

  // counter = 0
  // @action count(n) {
  //   this.counter += n
  // }
  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.orders[key] === undefined) this.orders[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n

  }
}

const store = window.OrdersStore = new OrdersStore()

export default store
