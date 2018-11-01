import { observable, action, computed } from 'mobx'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class MyTradesStore {
  constructor() {
    const start = () => {
      this.fetchMyTrades()
    }
    start()
    setInterval(() => {
      if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  hash = ''
  @observable myTrades = {}

  @action fetchMyTrades(){
    axios.get(`${this.terminalBackend}/myTrade/${this.stock}/${this.pair}`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)

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
