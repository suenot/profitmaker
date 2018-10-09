import { version, AsyncTrunk, ignore } from 'mobx-sync'
import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

@version(1)
class StocksStore {
  constructor(GlobalStore) {
    this.GlobalStore = GlobalStore
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'stocks' })
    trunk.init()
  }
  @observable stock = 'BINANCE'
  @computed get stockLowerCase() {
    return this.stock.toLowerCase()
  }

  @ignore @observable stocks = []
  @ignore @observable stocksFilter = ''

  @action setStocksFilter(_stock) {
    this.stocksFilter = _stock
  }

  @computed get stocksComputed() {
    return this.stocks.filter((stock) => {
      return stock.name.toLowerCase().indexOf( this.stocksFilter.toLowerCase() ) !== -1
    })
  }

  @action setStock(stock) {
    this.stock = stock
  }

  @action async fetchStocks() {
    axios.get('http://api.kupi.network:8051/stocks')
    .then((response) => {
      this.stocks = _.toArray(response.data)
    })
    .catch((error) => {
      this.stocks = []
      console.log(error)
    })
  }
}

// const store = window.StocksStore = new StocksStore()
// export default store

export default StocksStore
