import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import _ from 'lodash'

class MyTradesStore {
  @observable myTrades = {'LIQUI': {'DNT/BTC': {}}}
  @action fetchMyTrades(){
    axios.get('http://localhost:8051/myTrades')
    .then((response) => {
      this.myTrades = response.data
      // console.log('myTrades', this.myTrades)

    })
    .catch((error) => { console.log(error) })
  }
}

const store = window.MyTradesStore = new MyTradesStore()

export default store

autorun(() => {
  store.fetchMyTrades()
})
