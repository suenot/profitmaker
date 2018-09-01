import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class RawTradesStore {
  @observable stock = 'LIQUI'
  @observable pair = 'ETH_BTC'
  @observable rawTrades = []

  @action fetchRawTrades(){
    axios.get(`http://localhost:8051/trades/${this.stock}/${this.pair}`)
    .then((response) => {
      // response.data
      // this.rawTrades = response.data
      var data = [...response.data.data.buy, ...response.data.data.sell]
      this.rawTrades = _.orderBy(data, ['timestamp'], ['desc'])

    })
    .catch((error) => { console.log(error) })
  }


}

const store = window.RawTradesStore = new RawTradesStore()

export default store

autorun(() => {
  store.fetchRawTrades()
})
