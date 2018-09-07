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
        {/* <Table
          style={{width: '100%'}}
          columns={OrdersStore.columns}
          data={OrdersStore.ordersComputedText[type]}
        /> */}
        <table className="table">
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
                return <tr key={order.id} onClick={this.setAll.bind(this, order.price, order.amount, order.total)}>
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
  // setPrice(price, e) {
  //   e.stopPropagation()
  //   this.props.CreateOrderStore.setPrice(price)
  // }
  // setAmount(amount, e) {
  //   e.stopPropagation()
  //   this.props.CreateOrderStore.setAmount(amount)
  // }
  setAll(price, amount, total) {
    this.props.CreateOrderStore.setPrice(price)
    this.props.CreateOrderStore.setAmount(amount)
    this.props.CreateOrderStore.setTotal(total)
  }
}

export default Orders
