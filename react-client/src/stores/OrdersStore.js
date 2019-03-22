import { observable, action, computed } from 'mobx'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
import _ from 'lodash'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class OrdersStore {
  constructor() {
    this.start()
    this.interval = setInterval(() => {
      this.start()
    }, 1000)
  }

  @action start() {
    _.forEach(this.counters, (counter, key) => {
      console.log(counter, key)
      var [stock, pair] = key.split('--')
      if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOrders(stock, pair)
    })
  }

  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  interval = ''
  tubes = {}
  hashes = {}
  @observable orders = {}

  @action async fetchOrders_kupi(stockLowerCase, pair, key) {
    return axios.get(`${this.serverBackend}/${stockLowerCase}/orders/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.tubes[key] = 'ccxt'
      return {
        'asks': [],
        'bids': []
      }
    })
  }

  @action async fetchOrders_ccxt(stockLowerCase, pair) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/orders/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return {
        'asks': [],
        'bids': []
      }
    })
  }


  @action async fetchOrders(stock, pair) {
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}`
    var data
    if (this.tubes[key] === 'ccxt') {
      data = await this.fetchOrders_ccxt(stockLowerCase, pair)
    } else {
      data = await this.fetchOrders_kupi(stockLowerCase, pair, key)
    }

    if (this.hashes[key] === JSON.stringify(data)) return true
    this.hashes[key] = JSON.stringify(data)

    var _orders = data
    var sum = {asks: 0, bids: 0}

    for( let type of Object.keys(sum) ) {
      if ( !_.isEmpty(_orders[type]) ) {
        for( let [key, order] of Object.entries(_orders[type]) ) {
          var price = order[0]
          var amount = order[1]
          var total = price * amount
          sum[type] = total + sum[type]
          _orders[type][key] = {
            id: uuidv1(),
            price: price,
            amount: amount,
            total: total,
            sum: sum[type]
          }
        }
        _orders[type] = _.forEach(_orders[type], (order)=>{
          order.totalPercent = order.total / sum[type] * 100
          order.sumPercent = order.sum / sum[type] * 100
          order.totalPercentInverse = 100 - order.totalPercent
          order.sumPercentInverse = 100 - order.sumPercent
        })
      }
    }
    this.orders[key] = _orders

  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.orders[key] === undefined) this.orders[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}

const store = window.OrdersStore = new OrdersStore()

export default store
