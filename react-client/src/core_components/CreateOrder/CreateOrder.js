import React from 'react'
import { observer } from 'mobx-react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import InputAdornment from '@material-ui/core/InputAdornment'
import axios from 'axios'
import Alert from 'react-s-alert'

// import CreateOrderStore from 'stores/CreateOrderStore'
import BalanceStore from 'stores/BalanceStore'

@observer
class CreateOrder extends React.Component {
  state = {
    interval: '',
    data: [],
    form: { price: "", amount: "", total: ""},
    available: {
      buy: 0,
      sell: 0
    }
  }
  render() {
    const {pair, type, stock, accountId} = this.props.data
    var form = this.state.form
    // var available = this.state.available
    // var available = this.state.available
    var key = `${type}--${stock}--${accountId}`
    var available = BalanceStore.available(stock, pair, accountId)
    return (
      <div className="simpleForm">
        <div className="createOrder-header">
          Available: {(type === 'buy' ? available.buy : available.sell).toFixed(8)} {type === 'buy' ? pair.split('_')[1] : pair.split('_')[0]}
        </div>
        <div className="simpleForm-formGroup">
          <TextField
              id="outlined-name"
              label="Price"
              value={form.price}
              onChange={this.changeValue.bind(this, 'price')}
              variant="outlined"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">{pair.split('_')[1]}</InputAdornment>,
              }}
            />
        </div>
        <div className="simpleForm-formGroup">
          <TextField
              id="outlined-name"
              label="Amount"
              value={form.amount}
              onChange={this.changeValue.bind(this, 'amount')}
              variant="outlined"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">{pair.split('_')[0]}</InputAdornment>,
              }}
            />
        </div>
        <div className="simpleForm-formGroup">
          <TextField
              id="outlined-name"
              label="Total"
              value={form.total}
              onChange={this.changeValue.bind(this, 'total')}
              variant="outlined"
              fullWidth
              InputProps={{
                endAdornment: <InputAdornment position="end">{pair.split('_')[1]}</InputAdornment>,
              }}
            />
        </div>
        <Button variant="contained" color="secondary" className={'btn-'+type} onClick={this.createOrder.bind(this)}>
          {type}
        </Button>
      </div>
    )
  }
  changeValue(field, value) {
    value = value.target.value
    var amount
    var total
    var form = this.state.form
    if (field === 'price') {
      form.price = value
      total = (parseFloat(form.price) * parseFloat(form.amount)).toFixed(8)
      form.total = total !== 'NaN' ? total : ''
    } else if (field === 'amount') {
      form.amount = value
      total = (parseFloat(form.price) * parseFloat(form.amount)).toFixed(8)
      form.total = (total !== 'NaN') ? total : ''
    } else if (field === 'total') {
      form.total = value
      var amount = (parseFloat(form.total) / parseFloat(form.price)).toFixed(8)
      form.amount = amount !== 'NaN' ? amount : ''
    }
    this.setState({
      form: form
    })
  }

  createOrder() {
    const {stock, pair, type, accountId} = this.props.data
    var createMsg = 'creating ' + type + ' order on ' + stock + ': '+ pair + ' price: '+this.state.form.price + ' amount: ' + this.state.form.amount
    Alert.warning(createMsg)
    axios.post(`/user-api/createOrder`, {
      'stock': stock,
      'accountId': accountId,
      'pair': pair,
      'type': type,
      'price': this.state.form.price,
      'amount': this.state.form.amount
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

  // setPrice(price) {
  //   var form = this.state.form
  //   if (form === undefined) form = { price: "", amount: "", total: ""}
  //   form.price = price
  //   form.price = price
  // }

  // setAmount(amount) {
  //   var form = this.state.form
  //   if (form === undefined) form = { price: "", amount: "", total: ""}
  //   form.amount = amount
  //   form.amount = amount
  // }

  // setTotal(total) {
  //   var form = this.state.form
  //   if (form === undefined) form = { price: "", amount: "", total: ""}
  //   form.total = total.toFixed(8)
  //   form.total = total.toFixed(8)
  // }

  // componentDidMount() {
  //   const {stock, type, pair, accountId} = this.props.data
  //   var key = `${type}--${stock}--${accountId}`
  //   BalanceStore.fetchBalance(stock, key, type, accountId)
  //   setTimeout(()=>{
  //     BalanceStore.fetchBalance(stock, key, type, accountId)
  //   }, 3000)

  //   this.setState({
  //     interval: setInterval(()=>{
  //       var available = BalanceStore.available(stock, pair, accountId)
  //       console.log(available)
  //       if (JSON.stringify(available) !== JSON.stringify(this.state.available)) {
  //         this.setState({
  //           available: available
  //         })
  //       }
  //     }, 1000)
  //   })
  // }

  // componentWillUnmount() {
  //   if (this.state.interval) {
  //     clearInterval(this.state.interval)
  //     this.setState({ timer: null })
  //   }
  // }
}

export default CreateOrder
