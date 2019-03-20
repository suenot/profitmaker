import { observable, action, computed } from 'mobx'
import axios from 'axios'
import Alert from 'react-s-alert'
import _ from 'lodash'

import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class OpenOrdersStore {
  constructor() {
    const start = () => {
      _.forEach(this.counters, (counter, key) => {
        var [stock, pair, accountId] = key.split('--')
        if ( counter > 0 && (SettingsStore.fetchEnabled.value) ) this.fetchOpenOrders(stock, pair, accountId)
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

  @action fetchOpenOrders(stock, pair, accountId){
    var key = `${stock}--${pair}--${accountId}`
    axios.get(`/user-api/openOrders/${accountId}/${pair}`)
    .then((response) => {
      if (this.hashes[key] === JSON.stringify(response.data)) return true
      this.hashes[key] = JSON.stringify(response.data)
      this.openOrders[key] = response.data
    })
    .catch((error) => {
      this.openOrders[key] = 'error'
    })
  }

  @action cancelOrder(id, symbol, _id, stock, accountId) {
    var cancelMsg = stock + ': '+ symbol + ' canceling #' + id
    Alert.warning(cancelMsg)
    axios.post(`/user-api/cancelOrder/`, {
      id: id,
      _id: _id,
      symbol: symbol,
      stock: stock,
      accountId: accountId
    }).then((response) => {
      Alert.success('orderCanceled')
    }).catch((error) => {
      try {
        Alert.error(error.response.data.error)
      } catch(err) {
        Alert.error(JSON.stringify(error))
      }

    })
  }
  counters = {}
  @action count(n, data) {
    var key = `${data.stock}--${data.pair}--${data.accountId}`
    if (this.openOrders[key] === undefined) this.openOrders[key] = []
    if (this.counters[key] === undefined) this.counters[key] = 0
    this.counters[key] += n
    if (this.counters[key] === 0) {
      delete this.counters[key]
    }
  }
}


const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store
