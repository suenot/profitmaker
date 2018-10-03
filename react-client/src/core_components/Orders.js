import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'
import OrdersStore from '../stores/OrdersStore'
import CreateOrderStore from '../stores/CreateOrderStore'

@observer
class Orders extends React.Component {
  render() {
    const {data} = this.props
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
              _.map(OrdersStore.orders[type].slice(0, 15), (order) => {
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
    CreateOrderStore.setPrice(price)
    CreateOrderStore.setAmount(amount)
    CreateOrderStore.setTotal(total)
  }
  componentDidMount() {
    OrdersStore.count(1)
  }
  componentWillUnmount() {
    OrdersStore.count(-1)
  }
}

export default Orders
