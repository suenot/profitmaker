import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import GlobalStore from './GlobalStore'

class OrdersStore {

  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }

  @observable columns = [
    {
      label: "Price",
      prop: "price",
      width: 150,
    },
    {
      label: "Amount",
      prop: "amount",
      width: 150
    },
    {
      label: "Total",
      prop: "total",
      width: 150
    }
  ]
  @observable precision = 8
  @observable count = 0
  @observable orders = {
    'asks': [],
    'bids': []
  }

  @computed get ordersComputed() {
    var orders = {
      'asks': [],
      'bids': []
    }
    if (this.orders.asks && this.orders.asks !== []) {
      orders.asks = this.orders.asks.map((order) => {
        return {
          'id': String(order[0], order[1]),
          'price': parseFloat( order[0].toFixed(this.precision) ),
          'amount': parseFloat( order[1].toFixed(this.precision) ),
          'total': parseFloat( (order[0]*order[1]).toFixed(this.precision) ),
        }
      })
    }
    if (this.orders.bids && this.orders.bids !== []) {
      orders.bids = this.orders.bids.map((order) => {
        return {
          'id': String(order[0], order[1]),
          'price': parseFloat( order[0].toFixed(this.precision) ),
          'amount': parseFloat( order[1].toFixed(this.precision) ),
          'total': parseFloat( (order[0]*order[1]).toFixed(this.precision) ),
        }
      })
    }
    var _orders = {
      'asks': [],
      'bids': []
    }
    if ( (orders.bids && orders.bids !== [] )  &&  (orders.asks && orders.asks !== [] ) ) {
      var _askPrice = undefined
      var _bidPrice = undefined
      for (var order of orders.asks) {
        if (!order.amount) {
          // continue
        } else if (!_askPrice) {
          _orders.asks.push(order)
          _askPrice = order.price
        } else if (_askPrice === order.price) {
          _orders.asks[_orders.asks.length-1].amount = _orders.asks[_orders.asks.length-1].amount + order.amount
          _orders.asks[_orders.asks.length-1].total = _orders.asks[_orders.asks.length-1].amount * _orders.asks[_orders.asks.length-1].price
        } else {
          _orders.asks.push(order)
          _askPrice = order.price
        }
      }
      for (var order of orders.bids) {
        if (!order.amount) {
          // continue
        } else if (!_bidPrice) {
          _orders.asks.push(order)
          _bidPrice = order.price
        } else if (_bidPrice === order.price) {
          _orders.bids[_orders.bids.length-1].amount += order.amount
          _orders.bids[_orders.bids.length-1].total = _orders.bids[_orders.bids.length-1].amount * _orders.bids[_orders.bids.length-1].price
        } else {
          _orders.bids.push(order)
          _bidPrice = order.price
        }
      }
    }
    _orders.asks = _.orderBy(_orders.asks, ['price'], ['asc'])
    _orders.bids = _.orderBy(_orders.bids, ['price'], ['desc'])
    return _orders
  }

  @computed get ordersComputedText() {
    var orders = {
      'asks': [],
      'bids': []
    }
    var _orders = this.ordersComputed
    if (_orders.asks !== []) {
      orders.asks = _orders.asks.map((order) => {
        return {
          'id': order.id,
          'price': (order.price).toFixed(this.precision),
          'amount': (order.amount).toFixed(this.precision),
          'total': (order.total).toFixed(this.precision),
        }
      })
    }
    // if (!this.orders.asks || this.orders.asks === []) return []
    if (_orders.bids !== []) {
      orders.bids = _orders.bids.map((order) => {
        return {
          'id': order.id,
          'price': (order.price).toFixed(this.precision),
          'amount': (order.amount).toFixed(this.precision),
          'total': (order.total).toFixed(this.precision),
        }
      })
    }
    return orders
  }

  @computed get ordersCrocodile() {
    var _orders = {
      'asks': this.ordersComputed.asks,
      'bids': this.ordersComputed.bids,
    }
    var orders = {
      'asks': [],
      'bids': []
    }
    var _askTotal = 0
    var _bidTotal = 0
    if ( JSON.stringify(_orders.asks) !== '[]' ) {
      for (var order of _orders.asks) {
        order.price = parseFloat(order.price)
        order.amount = parseFloat(order.amount)
        order.total = parseFloat(order.total)
        _askTotal = order.total + _askTotal
        order.total = _askTotal
        orders.asks.push(order)
      }
    }
    if ( JSON.stringify(_orders.bids) !== '[]' ) {
      for (var order of _orders.bids) {
        order.price = parseFloat(order.price)
        order.amount = parseFloat(order.amount)
        order.total = parseFloat(order.total)
        _bidTotal = order.total + _bidTotal
        order.total = _bidTotal
        orders.bids.push(order)
      }
    }
    orders.asks = _.orderBy(orders.asks, ['price'], ['asc'])
    orders.bids = _.orderBy(orders.bids, ['price'], ['asc'])
    return orders
  }

  @computed get ordersChart() {
    let together = []
    var asks = []
    var bids = []
    if ( JSON.stringify(this.ordersCrocodile.bids) !== '[]' ) {
      bids = this.ordersCrocodile.bids
      bids = _.orderBy(bids, ['price'], ['asc'])
      bids.forEach((item, index) => {
        together.push({
          x: parseFloat(item.price),
          y: 0,
          z: parseFloat(item.total),
        })
      })
    }
    if ( JSON.stringify(this.ordersCrocodile.asks) !== '[]' ) {
      asks = this.ordersCrocodile.asks
      asks = _.orderBy(asks, ['price'], ['asc'])
      asks.forEach((item, index) => {
        together.push({
          x: parseFloat(item.price),
          y: parseFloat(item.total),
          z: 0,
        })
      })
    }
    return together
  }

  @action async fetchOrders() {
    axios.get(`http://localhost:8051/orders/${this.stock}/${this.pair}`)
    .then((response) => {
      this.orders = response.data
    })
    .catch((error) => {
      this.orders = {
        'asks': [],
        'bids': []
      }
      console.log(error)
    })
  }

  @action async precisionLess() {
    this.precision -= 1
  }
  @action async precisionMore() {
    this.precision += 1
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
