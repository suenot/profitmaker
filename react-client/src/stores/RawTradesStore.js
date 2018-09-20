import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class RawTradesStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get stockLowerCase() {return GlobalStore.stockLowerCase }
  @computed get pair() {return GlobalStore.pair }
  @observable rawTrades = []

  @action fetchRawTrades(){
    axios.get(`http://api.kupi.network/${this.stockLowerCase}/trades/${this.pair}`)
    .then((response) => {
      var rawTrades = response.data
      rawTrades.data.buy.map(function(trade){
        return trade.uuid = uuidv1()
      })
      rawTrades.data.sell.map(function(trade){
        return trade.uuid = uuidv1()
      })
      var data = [...rawTrades.data.buy, ...rawTrades.data.sell]
      this.rawTrades = _.orderBy(data, ['timestamp'], ['desc'])
    })
    .catch((error) => {
      this.rawTrades = []
      console.log(error)
    })
  }
}

const store = window.RawTradesStore = new RawTradesStore()

export default store

setInterval(() => {
  store.fetchRawTrades()
}, 5000)
