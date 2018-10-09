import { observable, action, computed } from 'mobx'
import axios from 'axios'
// import GlobalStore from './GlobalStore'
import StocksStore from './StocksStore'
import PairsStore from './PairsStore'
import uuidv1 from 'uuid/v1'

class MyTradesStore {
  constructor() {
    const start = () => {
      this.fetchMyTrades()
    }
    start()
    setInterval(() => {
      if (this.counter > 0) start()
    }, 5000)
  }
  @computed get stock() {return StocksStore.stock }
  @computed get pair() {return PairsStore.pair }

  @observable myTrades = {}

  @action fetchMyTrades(){
    axios.get(`http://localhost:8051/myTrade/${this.stock}/${this.pair}`)
    .then((response) => {
      var myTrades = response.data
      myTrades.map(function(trade){
        return trade.uuid = uuidv1()
      })
      this.myTrades = myTrades
    })
    .catch((error) => {
      this.myTrades = {}
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.MyTradesStore = new MyTradesStore()

export default store
