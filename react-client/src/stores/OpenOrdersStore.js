import { observable, action, computed, autorun } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'
import Alert from 'react-s-alert'

class OpenOrdersStore {
  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }


  @observable openOrders = {}
  @action fetchOpenOrders(){
    axios.get(`http://localhost:8051/openOrders/${this.stock}/${this.pair}`)
    .then((response) => {
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
    axios.post(`http://localhost:8051/cancelOrder/`, {
      id: id,
      _id: _id,
      symbol: symbol,
      stock: stock
    }).then((response) => {
      console.log(response.data)

      Alert.success('orderCanceled', {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    }).catch((error) => {
      console.log(error.response.data.error)
      Alert.error(error.response.data.error, {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    })
  }
}


const store = window.OpenOrdersStore = new OpenOrdersStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchOpenOrders()
})
