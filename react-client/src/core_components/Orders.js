import React from 'react'
import { inject, observer } from 'mobx-react'
import { Table } from 'element-react'
@inject('OrdersStore')
@observer
class Orders extends React.Component {
  render() {
    const {OrdersStore, data} = this.props
    const {type} = data
    return (
      <div>
        <Table
          style={{width: '100%'}}
          columns={OrdersStore.columns}
          data={OrdersStore.ordersComputedText[type]}
        />
      </div>
    )
  }
}

export default Orders
