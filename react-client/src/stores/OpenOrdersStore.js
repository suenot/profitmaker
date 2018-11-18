import { observable, action, computed } from 'mobx'
import axios from 'axios'
import Alert from 'react-s-alert'
import _ from 'lodash'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class OpenOrdersStore {
  constructor() {
    // const start = () => {
    //   this.fetchOpenOrders()
    // }
    // start()
    // setInterval(() => {
    //   if ( this.counter > 0 && (SettingsStore.fetchEnabled.value) ) start()
    // }, 5000)
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOpenOrders(stock, pair)
      })
    }
    start()
    setInterval(() => {
      start()
    }, 10000)
  }
  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  hashes = {}
  @observable openOrders = {}

  @action fetchOpenOrders(stock, pair){
    var key = `${stock}--${pair}`
    axios.get(`${this.terminalBackend}/openOrders/${stock}/${pair}`)
    .then((response) => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)
      this.openOrders[key] = response.data
    })
    .catch((error) => {
      this.openOrders[key] = []
      console.log(error)
    })
  }

  @action cancelOrder(id, symbol, _id, stock) {
    var cancelMsg = stock + ': '+ symbol + ' canceling #' + id
    Alert.warning(cancelMsg, {
      position: 'bottom-right',
      effect: 'scale',
      beep: false,
      timeout: 'none'
    })
    axios.post(`${this.terminalBackend}/cancelOrder/`, {
      id: id,
      _id: _id,
      symbol: symbol,
      stock: stock
    }).then((response) => {
      Alert.success('orderCanceled', {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    }).catch((error) => {
      Alert.error(error.response.data.error, {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    })
  }
  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}`
    if (this.openOrders[key] === undefined) this.openOrders[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
  }
}


const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store
