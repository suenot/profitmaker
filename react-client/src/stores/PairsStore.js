import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import StocksStore from './StocksStore'

class PairsStore {

  @computed get stock() {return StocksStore.stock }

  @observable pair = 'ETH_BTC'
  @observable coinFrom = 'ETH'
  @observable coinTo = 'BTC'

  @observable pairs = []

  @action setPair(pair) {
    console.log('SET PAIR')
    this.pair = pair
  }

  @action async fetchPairs() {
    axios.get(`http://localhost:8051/pairs/${this.stock}`)
    .then((response) => {
      this.pairs = response.data.map((pair) => {
        return pair.split('/').join('_')
      })
    })
    .catch((error) => { console.log(error) })
  }

}

const store = window.PairsStore = new PairsStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchPairs()
})
