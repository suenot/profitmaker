import { observable, action, computed } from 'mobx'
import axios from 'axios'
import Alert from 'react-s-alert'
import DashboardsStore from './DashboardsStore'
import SettingsStore from './SettingsStore'

class OpenOrdersStore {
  constructor() {
    const start = () => {
      this.fetchOpenOrders()
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
  @observable openOrders = {}
  @action fetchOpenOrders(){
    axios.get(`${this.terminalBackend}/openOrders/${this.stock}/${this.pair}`)
    .then((response) => {
      if (this.hash === JSON.stringify(response.data)) return true
      this.hash = JSON.stringify(response.data)

      this.openOrders = response.data
    })
    .catch((error) => { console.log(error) })
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
  counter = 0
  @action count(n) {
    this.counter += n
  }
}


const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store
