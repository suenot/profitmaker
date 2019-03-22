import React from 'react'
import { observer } from 'mobx-react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import InputAdornment from '@material-ui/core/InputAdornment'
import axios from 'axios'
import Alert from 'react-s-alert'

@observer
class CreateOrder extends React.Component {
  state = {
    interval: '',
    timer: 1000,
    form: { price: "", amount: "", total: ""},
    data: {
      buy: 0,
      sell: 0
    }
  }
  render() {
    const {pair, type} = this.props.data
    var form = this.state.form
    var available = this.state.data
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

  fetchBalanceAvailable(){
    var {stock, pair, accountId} = this.props.data
    axios.post(`/user-api/balance/available`, {
      stock, pair, accountId
    })
    .then(response => {
      if (this.state.hash === JSON.stringify(response.data)) return true
      this.setState({
        hash: JSON.stringify(response.data),
        data: response.data
      })
    })
    .catch(error => {
      console.log(error)
      this.setState({
        data: {
          buy: 0,
          sell: 0
        }
      })
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchBalanceAvailable()
      }, this.state.timer)
    })
  }
  finish() {
    if (this.state.interval) {
      clearInterval(this.state.interval)
      this.setState({ interval: null })
    }
  }
  componentDidMount() {
    this.start()
  }
  componentWillUnmount() {
    this.finish()
  }
}

export default CreateOrder
