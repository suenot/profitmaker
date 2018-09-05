import { observable, action, autorun, computed } from 'mobx'
import axios from 'axios'
import GlobalStore from './GlobalStore'
import Alert from 'react-s-alert'
class CreateOrderStore {

  @computed get stock() {return GlobalStore.stock }
  @computed get pair() {return GlobalStore.pair }

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

const store = window.CreateOrderStore = new CreateOrderStore()

export default store

autorun(() => {
  console.log(store.stock)
  console.log(store.pair)
  store.fetchMyTrades()
})
