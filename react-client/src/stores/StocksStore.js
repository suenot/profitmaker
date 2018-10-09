import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import DashboardsStore from './DashboardsStore'


class StocksStore {
  constructor(){
    setInterval(async () => {
      await this.fetchStocks()
    }, 1000)
  }

  @observable stocks = []
  @observable stocksFilter = ''

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
    DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].stock = stock
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

const store = window.StocksStore = new StocksStore()

export default store
