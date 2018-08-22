import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'

class Orderbooks {
    @observable precision = 8
    @observable orders = {
        'asks': [],
        'bids': []
    }
    @computed get asks() {
        return this.orders.asks.map((order) => {
            return {
                'id': String(order[0], order[1]),
                'price': order[0].toFixed(this.precision),
                'amount': order[1].toFixed(this.precision),
                'total': (order[0]*order[1]).toFixed(this.precision)
            }
        })
    }
    @computed get bids() {
        return this.orders.asks.map((order) => {
            return {
                'id': String(order[0], order[1]),
                'price': order[0].toFixed(this.precision),
                'amount': order[1].toFixed(this.precision),
                'total': (order[0]*order[1]).toFixed(this.precision)
            }
        })
    }

    @action async fetchOrders() {
        axios.get('/orders.json')
        .then((response) => {
            this.orders = response.data
        })
        .catch((error) => { console.log(error) })
    }

    @action async precisionLess() {
        this.precision -= 1
    }
    @action async precisionMore() {
        this.precision += 1
    }
}

const store = window.Orderbooks = new Orderbooks()

export default store

autorun(() => {
  store.fetchOrders()
  store.precisionLess()
  store.precisionLess()
})