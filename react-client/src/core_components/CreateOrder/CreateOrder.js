import React from 'react'
import { observer } from 'mobx-react'
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField'
import InputAdornment from '@material-ui/core/InputAdornment'

import CreateOrderStore from 'stores/CreateOrderStore'
import BalanceStore from 'stores/BalanceStore'

@observer
class CreateOrder extends React.Component {
  render() {
    const {stock, pair, type} = this.props.data
    const key = `${stock}--${pair}--${type}`
    if (CreateOrderStore.form[key] === undefined) this.initForm(key)
    return (
      <div className="simpleForm">
        <div className="createOrder-header">
          Available: {(type === 'buy' ? BalanceStore.available(stock, pair).buy : BalanceStore.available(stock, pair).sell).toFixed(8)} {type === 'buy' ? pair.split('_')[1] : pair.split('_')[0]}
        </div>
        <div className="simpleForm-formGroup">
          <TextField
              id="outlined-name"
              label="Price"
              value={CreateOrderStore.form[key].price}
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
              value={CreateOrderStore.form[key].amount}
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
              value={CreateOrderStore.form[key].total}
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
    const {stock, pair, type} = this.props.data
    // console.log(value)
    CreateOrderStore.createChange(stock, pair, type, field, value.target.value)
  }
  createOrder() {
    const {stock, pair, type} = this.props.data
    CreateOrderStore.createOrder(stock, pair, type)
  }
  componentDidMount() {
    // BalanceStore.count(1, this.props.data)
    // TODO: fix thix hack
    setTimeout(()=>{
      this.forceUpdate()
    }, 2000)
  }
  // componentWillMount() {
  //   BalanceStore.count(1, this.props.data)
  // }
  // componentWillUnmount() {
  //   BalanceStore.count(-1, this.props.data)
  // }
  // componentWillUpdate() {
  //   BalanceStore.count(-1, this.props.data)
  // }
  // componentDidUpdate() {
  //   BalanceStore.count(1, this.props.data)
  // }
  initForm(key) {
    CreateOrderStore.initForm(key)
  }
}

export default CreateOrder
