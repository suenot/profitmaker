import React from 'react'
import { inject, observer } from 'mobx-react'
import { Input, Button } from 'element-react'

@inject('CreateOrderStore')
@observer
class CreateOrder extends React.Component {
  render() {
    const {CreateOrderStore, classes, data} = this.props
    const {type} = data
    return (
      <div>
        <p>
          <div className="text">Price</div>
          <Input placeholder="Price" value={CreateOrderStore.createPrice[type]} onChange={this.changeValue.bind(this, 'price', type)} />
        </p>
        <p>
          <div className="text">Amount</div>
          <Input placeholder="Amount" value={CreateOrderStore.createAmount[type]} onChange={this.changeValue.bind(this, 'amount', type)} />
        </p>
        <p>
          <div className="text">Total</div>
          <Input placeholder="Total" value={CreateOrderStore.createTotal[type]} onChange={this.changeValue.bind(this, 'total', type)} />
        </p>
        <p>
          <Button type={type === 'buy' ? 'success' : 'danger'} onClick={this.createOrder.bind(this, type)}>{type}</Button>
        </p>
      </div>
    )
  }
  changeValue(field, type, value) {
    this.props.CreateOrderStore.createChange(value, field, type)
  }
  createOrder(type) {
    this.props.CreateOrderStore.createOrder(type)
  }
}

export default CreateOrder
