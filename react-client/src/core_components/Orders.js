import React from 'react'
import { inject, observer } from 'mobx-react'
import _ from 'lodash'
// import { Table } from 'element-react'
@inject('OrdersStore')
@observer
class Orders extends React.Component {
  render() {
    const {OrdersStore, data} = this.props
    const {type} = data
    return (
      <div>
        {/* <Table
          style={{width: '100%'}}
          columns={OrdersStore.columns}
          data={OrdersStore.ordersComputedText[type]}
        /> */}
        <table class="table">
          <thead>
            <tr>
              <td>price</td>
              <td>amount</td>
              <td>total</td>
            </tr>
          </thead>
          <tbody>
            {
              _.map(OrdersStore.ordersComputedText[type], (order) => {
                return <tr key={order}>
                  <td><a href="#">{order.price}</a></td>
                  <td><a href="#">{order.amount}</a></td>
                  <td><a href="#">{order.total}</a></td>
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
