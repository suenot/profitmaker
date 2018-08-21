import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('OrdersStore')
@observer
class Orders extends React.Component {
  render() {
    const {OrdersStore, type} = this.props
    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>price</th>
              <th>amount</th>
              <th>total</th>
            </tr>
          </thead>
          <tbody>
            {
              _.map(OrdersStore[type], (order) => {
                return <tr key={order.id}>
                  <td>{order.price}</td>
                  <td>{order.amount}</td>
                  <td>{order.total}</td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
}

export default Orders
