import { observable, action, computed } from 'mobx'
import axios from 'axios'
import _ from 'lodash'
// import uuidv1 from 'uuid/v1'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class TradesStore {
  constructor() {
    const start = () => {
      this.fetchTrades()
    }
    start()
    setInterval(() => {
      if (this.counter > 0) start()
    }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get stockLowerCase() {return DashboardsStore.stockLowerCase }
  @computed get pair() {return DashboardsStore.pair }
  @computed get serverBackend() {return SettingsStore.serverBackend.value }

  @observable trades = []

  @action fetchTrades(){
    axios.get(`${this.serverBackend}/${this.stockLowerCase}/trades/${this.pair}`)
    .then((response) => {
      var trades = _.orderBy(response.data, ['timestamp'], ['desc'])
      // trades = trades.map(function(trade){
      //   return trade.uuid = uuidv1()
      // })
      this.trades = trades
    })
    .catch(() => {
      this.trades = []
    })
  }

  counter = 0
  @action count(n) {
    this.counter += n
  }
}

const store = window.TradesStore = new TradesStore()

export default store
