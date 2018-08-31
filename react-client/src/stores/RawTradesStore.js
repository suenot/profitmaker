import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class RawTradesStore {
  @observable stock = 'LIQUI'
  @observable pair = 'ETH_BTC'
  @observable rawTrades = {'LIQUI': {'DNT/BTC': {}}}
  @action fetchRawTrades(){
    axios.get(`http://localhost:8051/trades/${this.stock}/${this.pair}`)
    .then((response) => {
      this.rawTrades = response.data
      // console.log('myTrades', this.myTrades)

    })
    .catch((error) => { console.log(error) })
  }
}

const store = window.RawTradesStore = new RawTradesStore()

export default store

autorun(() => {
  store.fetchRawTrades()
})
