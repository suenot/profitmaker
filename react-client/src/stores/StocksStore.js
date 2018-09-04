import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import PairsStore from './PairsStore'

class StocksStore {

  @computed get pair() {return PairsStore.pair }

  @observable stock = 'LIQUI'

  @observable stocks = {}

  @action setStock(stock) {
    console.log('SET STOCK')
    this.stock = stock
  }

  @action async fetchStocks() {
    axios.get('http://localhost:8051/stocks')
    .then((response) => {
      this.stocks = response.data
    })
    .catch((error) => { console.log(error) })
  }

}

const store = window.StocksStore = new StocksStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchStocks()
})
