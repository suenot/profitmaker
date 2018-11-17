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


  // @observable createPrice = {'buy': '', 'sell': ''}
  // @observable createAmount = {'buy': '', 'sell': ''}
  // @observable createTotal = {'buy': '', 'sell': ''}

  @observable form = {}

  @action createChange(stock, pair, type, field, value) {
    var key = `${stock}--${pair}--${type}`
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

    // if (field === 'price') {
    //   this.createPrice[type] = value
    //   total = (parseFloat(this.createPrice[type]) * parseFloat(this.createAmount[type])).toFixed(8)
    //   this.createTotal[type] = total !== 'NaN' ? total : ''
    // } else if (field === 'amount') {
    //   this.createAmount[type] = value
    //   total = (parseFloat(this.createPrice[type]) * parseFloat(this.createAmount[type])).toFixed(8)
    //   this.createTotal[type] = (total !== 'NaN') ? total : ''
    // } else if (field === 'total') {
    //   this.createTotal[type] = value
    //   var amount = (parseFloat(this.createTotal[type]) / parseFloat(this.createPrice[type])).toFixed(8)
    //   this.createAmount[type] = amount !== 'NaN' ? amount : ''
    // }
  }

  @action createOrder(stock, pair, type) {
    var key = `${stock}--${pair}--${type}`
    var createMsg = 'creating ' + type + ' order on ' + stock + ': '+ pair + ' price: '+this.form['price'][type] + ' amount: ' + this.form['amount'][type]
    Alert.warning(createMsg, {
      position: 'bottom-right',
      effect: 'scale',
      beep: false,
      timeout: 'none'
    })
    axios.post(`${this.terminalBackend}/createOrder`, {
      'stock': stock,
      'pair': pair,
      'type': type,
      'price': this.form[key]['price'],
      'amount': this.form[key]['amount'],
      // 'stock': this.stock,
      // 'pair': this.pair,
      // 'type': type,
      // 'price': this.createPrice[type],
      // 'amount': this.createAmount[type],
    })
    .then((response) => {
      // console.log(response)
      console.log(response.data)

      Alert.success('orderCreated', {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })

    })
    .catch((error) => {
      var errorMessage = 'Server is not available'
      try {
        errorMessage = error.response.data.error
      } catch(err) {}
      Alert.error(errorMessage, {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    })
  }

  @action setPrice(price) {
    // const {stock, pair, type} = this.props.data
    // this.createPrice['buy'] = price
    // this.createPrice['sell'] = price
    this.form['price']['buy'] = price
    this.form['price']['sell'] = price
  }

  @action setAmount(amount) {
    // const {stock, pair, type} = this.props.data
    // this.createAmount['buy'] = amount
    // this.createAmount['sell'] = amount
    this.form['amount']['buy'] = amount
    this.form['amount']['sell'] = amount
  }

  @action setTotal(total) {
    // const {stock, pair, type} = this.props.data
    // this.createTotal['buy'] = total.toFixed(8)
    // this.createTotal['sell'] = total.toFixed(8)
    this.form['total']['buy'] = total.toFixed(8)
    this.form['total']['sell'] = total.toFixed(8)
  }

  @action initForm(key) {
    this.form[key] = { price: "", amount: "", total: ""}
  }
}

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

