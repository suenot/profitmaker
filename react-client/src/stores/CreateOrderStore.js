import { observable, action, computed } from 'mobx'
import axios from 'axios'
import Alert from 'react-s-alert'

import DashboardsStore from './DashboardsStore'
import BalanceStore from './BalanceStore'
import SettingsStore from './SettingsStore'

class CreateOrderStore {
  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }

  @computed get availableBuy() {return BalanceStore.availableBuy }
  @computed get availableSell() {return BalanceStore.availableSell }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  @observable form = {}

  @action createChange(stock, pair, type, accountId, field, value) {
    var key = `${stock}--${pair}--${type}--${accountId}`
    var total
    if (field === 'price') {
      this.form[key]['price'] = value
      total = (parseFloat(this.form[key]['price']) * parseFloat(this.form[key]['amount'])).toFixed(8)
      this.form[key]['total'] = total !== 'NaN' ? total : ''
    } else if (field === 'amount') {
      this.form[key]['amount'] = value
      total = (parseFloat(this.form[key]['price']) * parseFloat(this.form[key]['amount'])).toFixed(8)
      this.form[key]['total'] = (total !== 'NaN') ? total : ''
    } else if (field === 'total') {
      this.form[key]['total'] = value
      var amount = (parseFloat(this.form[key]['total']) / parseFloat(this.form[key]['price'])).toFixed(8)
      this.form[key]['amount'] = amount !== 'NaN' ? amount : ''
    }
  }

  @action createOrder(stock, pair, type, accountId) {
    var key = `${stock}--${pair}--${type}--${accountId}`
    var createMsg = 'creating ' + type + ' order on ' + stock + ': '+ pair + ' price: '+this.form[key]['price'] + ' amount: ' + this.form[key]['amount']
    Alert.warning(createMsg)
    axios.post(`/user-api/createOrder`, {
      'stock': stock,
      'accountId': accountId,
      'pair': pair,
      'type': type,
      'price': this.form[key]['price'],
      'amount': this.form[key]['amount']
    })
    .then((response) => {
      Alert.success('orderCreated')
    })
    .catch((error) => {
      var errorMessage = 'Server is not available'
      try {
        errorMessage = error.response.data.error
      } catch(err) {}
      Alert.error(errorMessage)
    })
  }

  @action setPrice(price, key) {
    if (this.form[key] === undefined) this.form[key] = { price: "", amount: "", total: ""}
    this.form[key]['price'] = price
    this.form[key]['price'] = price
  }

  @action setAmount(amount, key) {
    if (this.form[key] === undefined) this.form[key] = { price: "", amount: "", total: ""}
    this.form[key]['amount'] = amount
    this.form[key]['amount'] = amount
  }

  @action setTotal(total, key) {
    if (this.form[key] === undefined) this.form[key] = { price: "", amount: "", total: ""}
    this.form[key]['total'] = total.toFixed(8)
    this.form[key]['total'] = total.toFixed(8)
  }

  @action initForm(key) {
    this.form[key] = { price: "", amount: "", total: ""}
  }
}

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

