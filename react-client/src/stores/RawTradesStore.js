import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class RawTradesStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }
  // @observable stock = 'LIQUI'
  // @observable pair = 'ETH_BTC'
  @observable rawTrades = []

  @action fetchRawTrades(){
    axios.get(`http://localhost:8051/trades/${this.stock}/${this.pair}`)
    .then((response) => {
      // response.data
      // this.rawTrades = response.data
      var rawTrades = response.data
      rawTrades.buy.map(function(trade){
        return trade.uuid = uuidv1()
      })
      rawTrades.sell.map(function(trade){
        return trade.uuid = uuidv1()
      })
      var data = [...rawTrades.buy, ...rawTrades.sell]
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

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchRawTrades()
})
