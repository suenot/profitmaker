import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class TradesStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get stockLowerCase() {return GlobalStore.stockLowerCase }
  @computed get pair() {return GlobalStore.pair }
  @observable trades = []

  @action fetchTrades(){
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/trades/${this.pair}`)
    .then((response) => {
      var trades = response.data
      trades.data.buy.map(function(trade){
        return trade.uuid = uuidv1()
      })
      trades.data.sell.map(function(trade){
        return trade.uuid = uuidv1()
      })
      var data = [...trades.data.buy, ...trades.data.sell]
      this.trades = _.orderBy(data, ['timestamp'], ['desc'])
    })
    .catch(() => {
      this.trades = []
    })
  }
}

const store = window.TradesStore = new TradesStore()

export default store

setInterval(() => {
  store.fetchTrades()
}, 5000)
