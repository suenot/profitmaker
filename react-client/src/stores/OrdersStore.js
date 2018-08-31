import { observable, action, computed, autorun, toJS } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class OrdersStore {


    @observable createBuyPrice = 0
    @observable createBuyAmount = 0


    @observable createSellPrice = 0
    @observable createSellAmount = 0


    @computed get createSellTotal() {
      return (parseFloat(this.createSellPrice) * parseFloat(this.createSellAmount)).toFixed(8)
    }


    @observable columns = [
      {
        label: "Price",
        prop: "price",
        width: 150
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
    @observable stock = 'LIQUI'
    @observable pair = 'ETH_BTC'
    @observable coinFrom = 'ETH'
    @observable coinTo = 'BTC'
    @observable orders = {
        'asks': [],
        'bids': []
    }

    @observable pairs = []
    @observable stocks = {}
    // @observable _ordersChart = []
    @observable ohlcv = []

    // @computed get encodedPair() {
    //     return encodeURI(this.pair)
    // }
    @computed get ordersComputed() {
        var orders = {
            'asks': [],
            'bids': []
        }
        if (this.orders.asks && this.orders.asks != []) {
            orders.asks = this.orders.asks.map((order) => {
                return {
                    'id': String(order[0], order[1]),
                    'price': parseFloat( order[0].toFixed(this.precision) ),
                    'amount': parseFloat( order[1].toFixed(this.precision) ),
                    'total': parseFloat( (order[0]*order[1]).toFixed(this.precision) )
                }
            })
        }
        // if (!this.orders.asks || this.orders.asks === []) return []
        if (this.orders.bids && this.orders.bids != []) {
            orders.bids = this.orders.bids.map((order) => {
                return {
                    'id': String(order[0], order[1]),
                    'price': parseFloat( order[0].toFixed(this.precision) ),
                    'amount': parseFloat( order[1].toFixed(this.precision) ),
                    'total': parseFloat( (order[0]*order[1]).toFixed(this.precision) )
                }
            })
        }

        var _orders = {
            'asks': [],
            'bids': []
        }
        if ( (orders.bids && orders.bids != [] )  &&  (orders.asks && orders.asks != [] ) ) {
            // union orders with equal price
            // console.log('UNION')
            var _askPrice = undefined
            var _bidPrice = undefined
            for (var order of orders.asks) {
                if (!order.amount) {
                    // continue
                } else if (!_askPrice) {
                    // console.log('ASK FIRST')
                    _orders.asks.push(order)
                    _askPrice = order.price
                } else if (_askPrice === order.price) {
                    // console.log('ASK EQUAL')
                    // console.log(_orders.asks[_orders.asks.length-1].amount)
                    _orders.asks[_orders.asks.length-1].amount = _orders.asks[_orders.asks.length-1].amount + order.amount
                    _orders.asks[_orders.asks.length-1].total = _orders.asks[_orders.asks.length-1].amount * _orders.asks[_orders.asks.length-1].price
                } else {
                    // console.log('ASK NEW')
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
                    // console.log('00000000000')
                    // console.log(order.amount)
                    _orders.bids[_orders.bids.length-1].amount += order.amount
                    _orders.bids[_orders.bids.length-1].total = _orders.bids[_orders.bids.length-1].amount * _orders.bids[_orders.bids.length-1].price
                } else {
                    _orders.bids.push(order)
                    _bidPrice = order.price
                }
            }
            console.log('___ORDERS')
            console.log(_orders)
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
        console.log(this.ordersComputed)
        var _orders = {
            'asks': this.ordersComputed.asks,
            'bids': this.ordersComputed.bids,
        }
        // _orders.asks = _.orderBy(this.ordersComputed.asks, ['price'], ['asc'])
        // _orders.bids = _.orderBy(this.ordersComputed.bids, ['price'], ['asc'])
        var orders = {
            'asks': [],
            'bids': []
        }
        var _askTotal = 0
        var _bidTotal = 0
        // console.log('*******')
        if ( JSON.stringify(_orders.asks) != '[]' ) {
            for (var order of _orders.asks) {
                // if (!order.amount) {
                //     continue
                // }
                order.price = parseFloat(order.price)
                order.amount = parseFloat(order.amount)
                order.total = parseFloat(order.total)

                // console.log('33333333')
                // console.log(order)
                _askTotal = order.total + _askTotal
                order.total = _askTotal
                orders.asks.push(order)
                // console.log(orders)
            }
        }
        if ( JSON.stringify(_orders.bids) != '[]' ) {
            for (var order of _orders.bids) {
                // if (!order.amount) {
                //     continue
                // }

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
        // console.log('888888888888')
        // console.log(this.ordersCrocodile.asks)
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

        // together = _.orderBy(together, ['x'], ['asc'])
        return together
    }

    @computed get ohlcvComputed() {
        return this.ohlcv.map((item) => {
            return {
                'date': new Date(item[0]),
                'open': item[1],
                'high': item[2],
                'low': item[3],
                'close': item[4],
                'volume': item[5],
                'absoluteChange': '',
                'dividend': '',
                'percentChange': '',
                'split': '',
            }
        })

    }


    @action setStock(stock) {
        console.log('SET STOCK')
        this.stock = stock
    }
    @action setPair(pair) {
        console.log('SET PAIR')
        this.pair = pair
    }
    @action async fetchStocks() {
        // axios.get('/orders.json')
        // axios.get(`http://144.76.109.194:8051/orders/${this.stock}/${encodeURI(this.pair)}`)
        axios.get('http://localhost:8051/stocks')
        .then((response) => {
            this.stocks = response.data
            // console.log(response)
            // this.pairs = response.data.map((pair) => {
            //     return pair.split('/').join('_')
            // })
        })
        .catch((error) => { console.log(error) })
    }
    @action async fetchPairs() {
        // axios.get('/orders.json')
        // axios.get(`http://144.76.109.194:8051/orders/${this.stock}/${encodeURI(this.pair)}`)
        axios.get(`http://localhost:8051/pairs/${this.stock}`)
        .then((response) => {
            // console.log(response)

            this.pairs = response.data.map((pair) => {
                return pair.split('/').join('_')
            })
        })
        .catch((error) => { console.log(error) })
    }
    @action async fetchOrders() {
        // axios.get('/orders.json')
        // axios.get(`http://144.76.109.194:8051/orders/${this.stock}/${encodeURI(this.pair)}`)
        axios.get(`http://localhost:8051/orders/${this.stock}/${this.pair}`)
        .then((response) => {
            // console.log(response)
            this.orders = response.data
        })
        .catch((error) => { console.log(error) })
    }
    @action async fetchOHLCV() {
        axios.get(`http://localhost:8051/ohlcv/${this.stock}/${this.pair}`)
        .then((response) => {
            // console.log('RESPONSE')
            // console.log(response)
            this.ohlcv = response.data.data
        })
        .catch((error) => {
            console.log('ERRROR')
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
        store.fetchPairs()
        store.fetchOrders()
        store.fetchOHLCV()
    }
)

autorun(() => {
  store.fetchStocks()
  store.fetchPairs()
  store.fetchOrders()
  store.fetchOHLCV()
})
