import React from 'react'
import { observer } from 'mobx-react'
import { Input } from 'element-react'
import CreateOrderStore from '../../stores/CreateOrderStore'
import BalanceStore from '../../stores/BalanceStore'
import Button from '@material-ui/core/Button'

@observer
class CreateOrder extends React.Component {
  render() {
    const {data } = this.props
    const {type} = data
    return (
      <div className="simpleForm">
        <div className="createOrder-header">
          Available: {(type === 'buy' ? CreateOrderStore.availableBuy : CreateOrderStore.availableSell).toFixed(8)} {type === 'buy' ? CreateOrderStore.pair.split('_')[1] : CreateOrderStore.pair.split('_')[0]}
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">Price</div>
          <Input placeholder="Price" value={CreateOrderStore.createPrice[type]} onChange={this.changeValue.bind(this, 'price', type)} append={CreateOrderStore.pair.split('_')[1]}/>
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">Amount</div>
          <Input placeholder="Amount" value={CreateOrderStore.createAmount[type]} onChange={this.changeValue.bind(this, 'amount', type)} append={CreateOrderStore.pair.split('_')[0]}/>
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">Total</div>
          <Input placeholder="Total" value={CreateOrderStore.createTotal[type]} onChange={this.changeValue.bind(this, 'total', type)} append={CreateOrderStore.pair.split('_')[1]}/>
        </div>
        {/* <Button type={type === 'buy' ? 'success' : 'danger'} >{type}</Button> */}
        <Button variant="contained" color="secondary" className={'btn-'+type} onClick={this.createOrder.bind(this, type)}>
          {type}
        </Button>
      </div>
    )
  }
  changeValue(field, type, value) {
    CreateOrderStore.createChange(value, field, type)
  }
  createOrder(type) {
    CreateOrderStore.createOrder(type)
  }
  componentDidMount() {
    BalanceStore.count('balanceStock_counter', 1)
  }
  componentWillUnmount() {
    BalanceStore.count('balanceStock_counter', -1)
  }
}

export default CreateOrder
