import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'

// import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'
import KeysStore from './KeysStore'

class StocksStore {
  constructor(){
    this.fetchStocks()
    setInterval(async () => {
      await this.fetchStocks()
    }, 1000)
  }

  @computed get serverBackend() {return SettingsStore.serverBackend.value }
  @computed get accounts() {return KeysStore.accounts }

  hash = ''
  @observable stocks = []
  @observable stocksFilter = ''

  @action setStocksFilter(_stock) {
    this.stocksFilter = _stock
  }

  @computed get stocksComputed() {
    var _stocks = []
    var stocks = _.clone(this.stocks)
    stocks.filter((stock) => {
      return stock.name.toLowerCase().indexOf( this.stocksFilter.toLowerCase() ) !== -1
    })
    stocks.map((stock)=>{
      _stocks.push({
        id: `${stock.name}`,
        name: stock.name,
      })
      for (let account of Object.values(this.accounts)) {
        if (account.stock.toUpperCase() === stock.name) {
          _stocks.push({
            id: `${stock.name}--${account.id}`,
            name: stock.name,
            accountId: account.id,
            accountName: account.name
          })
        }
      }
    })
    return _stocks
  }

  // @action setStock(stock) {
  //   this.stock = stock
  //   // DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].stock = stock
  //   DashboardsStore.setWidgetsData('stock', stock)
  //   // var widgets = DashboardsStore.dashboards[ DashboardsStore.dashboardActiveId ].widgets
  //   // console.log(widgets)
  //   // _.forEach(widgets, (widget)=>{
  //   //   // console.log(widget)
  //   //   widget.stock = stock
  //   // })
  // }

  @action async fetchStocks() {
    axios.get(`${this.serverBackend}/stocks`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) {
        return true
      }
      this.hash = JSON.stringify(response.data)
      this.stocks = _.toArray(response.data)
    })
    .catch((error) => {
      this.stocks = []
      console.log(error)
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.StocksStore = new StocksStore()

export default store
