import React from 'react'
import { inject, observer } from 'mobx-react'
import _ from 'lodash'
// import { Table } from 'element-react'
@inject('CreateOrderStore')
@inject('OrdersStore')
@observer
class Orders extends React.Component {
  render() {
    const {OrdersStore, data} = this.props
    const {type} = data
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th className="simpleTable-header">price</th>
              <th className="simpleTable-header">amount</th>
              <th className="simpleTable-header">total</th>
            </tr>
          </thead>
          <tbody>
            {
              _.map(OrdersStore.orders[type], (order) => {
                return <tr key={order.id} onClick={this.setAll.bind(this, order.price, order.amount, order.total)}>
                  <td>{order.price.toFixed(8)}</td>
                  <td>{order.amount.toFixed(8)}</td>
                  <td>{order.total.toFixed(8)}</td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  setAll(price, amount, total) {
    this.props.CreateOrderStore.setPrice(price)
    this.props.CreateOrderStore.setAmount(amount)
    this.props.CreateOrderStore.setTotal(total)
  }
}

export default Orders
