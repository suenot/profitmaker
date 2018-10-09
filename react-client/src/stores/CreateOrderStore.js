import { observable, action, computed } from 'mobx'
import axios from 'axios'
import DashboardsStore from './DashboardsStore'
import BalanceStore from './BalanceStore'
import Alert from 'react-s-alert'


class CreateOrderStore {
  @computed get stock() {return DashboardsStore.stock }
  @computed get pair() {return DashboardsStore.pair }

  @computed get availableBuy() {return BalanceStore.availableBuy }
  @computed get availableSell() {return BalanceStore.availableSell }



  @observable createPrice = {'buy': '', 'sell': ''}
  @observable createAmount = {'buy': '', 'sell': ''}
  @observable createTotal = {'buy': '', 'sell': ''}

  @action createChange(value, field, type) {
    var total
    if (field === 'price') {
      this.createPrice[type] = value
      total = (parseFloat(this.createPrice[type]) * parseFloat(this.createAmount[type])).toFixed(8)
      this.createTotal[type] = total !== 'NaN' ? total : ''
    } else if (field === 'amount') {
      this.createAmount[type] = value
      total = (parseFloat(this.createPrice[type]) * parseFloat(this.createAmount[type])).toFixed(8)
      this.createTotal[type] = (total !== 'NaN') ? total : ''
    } else if (field === 'total') {
      this.createTotal[type] = value
      var amount = (parseFloat(this.createTotal[type]) / parseFloat(this.createPrice[type])).toFixed(8)
      this.createAmount[type] = amount !== 'NaN' ? amount : ''
    }
  }

  @action createOrder(type) {
    var createMsg = 'creating ' + type + ' order on ' + this.stock + ': '+ this.pair + ' price: '+this.createPrice[type] + ' amount: ' + this.createAmount[type]
    Alert.warning(createMsg, {
      position: 'bottom-right',
      effect: 'scale',
      beep: false,
      timeout: 'none'
    })
    axios.post('http://localhost:8051/createOrder', {
      'stock': this.stock,
      'pair': this.pair,
      'type': type,
      'price': this.createPrice[type],
      'amount': this.createAmount[type],
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
      Alert.error(error.response.data.error, {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    })
  }

  @action setPrice(price) {
    this.createPrice['buy'] = price
    this.createPrice['sell'] = price
  }

  @action setAmount(amount) {
    this.createAmount['buy'] = amount
    this.createAmount['sell'] = amount
  }

  @action setTotal(total) {
    this.createTotal['buy'] = total.toFixed(8)
    this.createTotal['sell'] = total.toFixed(8)
  }
}

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

