import { observable, action, computed } from 'mobx'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
import _ from 'lodash'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class MyTradesStore {
  constructor() {
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchMyTrades(stock, pair)
      })
    }
    start()
    setInterval(() => {
      start()
    }, 15000)
    // const start = () => {
    //   this.fetchMyTrades()
    // }
    // start()
    // setInterval(() => {
    //   if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    // }, 5000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  hashes = {}
  @observable myTrades = {}

  @action fetchMyTrades(stock, pair){
    var key = `${stock}--${pair}`
    axios.get(`${this.terminalBackend}/myTrade/${stock}/${pair}`)
    .then((response) => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)

      var myTrades = response.data
      myTrades.map(function(trade){
        return trade.uuid = uuidv1()
      })
      this.myTrades[key] = myTrades
    })
    .catch((error) => {
      // this.myTrades[key] = {}
      this.myTrades[key] = 'error'
    })
  }

  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.myTrades[key] === undefined) this.myTrades[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}

const store = window.MyTradesStore = new MyTradesStore()

export default store
