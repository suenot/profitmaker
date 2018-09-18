import { observable, action, computed } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'
import uuidv1 from 'uuid/v1'

class MyTradesStore {

  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }

  @observable myTrades = {}

  @action fetchMyTrades(){
    axios.get(`http://localhost:8051/myTrades/${this.stock}/${this.pair}`)
    .then((response) => {
      var myTrades = response.data
      myTrades.map(function(trade){
        return trade.uuid = uuidv1()
      })
      this.myTrades = myTrades
    })
    .catch((error) => {
      console.log(error)
      this.myTrades = {}
    })
  }

}

const store = window.MyTradesStore = new MyTradesStore()

export default store

setInterval(() => {
  store.fetchMyTrades()
}, 5000)
