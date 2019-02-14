import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'
import Preloader from '../Preloader'

import OrdersStore from 'stores/OrdersStore'
import CreateOrderStore from 'stores/CreateOrderStore'

@observer
class Orders extends React.Component {
  render() {
    const {type, stock, pair, visualMode, visualModeMax, visualModeCrocodileMax, visualModeWallsMax} = this.props.data
    var [coinFrom, coinTo] = pair.split('_')
    var key = `${stock}--${pair}`
    var color = type === 'asks' ? 'rgba(255, 138, 138, 0.42)' : 'rgba(78, 136, 71, 0.42)'
    if (OrdersStore.orders[key] === undefined || OrdersStore.orders[key][type] === undefined) {
			return <Preloader />
		}
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th className="simpleTable-header">price <span className="muted">{coinTo}</span></th>
              <th className="simpleTable-header">amount <span className="muted">{coinFrom}</span></th>
              <th className="simpleTable-header">total <span className="muted">{coinTo}</span></th>
              <th className="simpleTable-header">sum <span className="muted">{coinTo}</span></th>
            </tr>
          </thead>
          <tbody>
            {
              _.map(OrdersStore.orders[key][type].slice(0, 30), (order) => {
                var percent = 0

                if (visualMode !== 'none') {
                  if (visualModeMax === 'total sum') {
                    percent = visualMode === 'crocodile' ? order.sumPercent : order.totalPercent
                  } else { // fixed
                    if (visualMode === 'crocodile') {
                      if (visualModeCrocodileMax >= order.total) percent = 100
                      percent = order.sum / visualModeCrocodileMax * 100
                    } else { // wall
                      if (visualModeWallsMax >= order.total) percent = 100
                      percent = order.total / visualModeWallsMax * 100
                    }
                  }
                }

                var percentInverse = 100 - percent
                var percentInverseToFixed = percentInverse.toFixed(2)
                return <tr
                  key={order.id}
                  onClick={this.setAll.bind(this, order.price, order.amount, order.total)}
                  style={{background: `linear-gradient(to right, #ffffff 0%, #ffffff ${percentInverseToFixed}%, ${color} ${percentInverseToFixed}%, ${color} 100%)`}}
                >
                  <td>{order.price.toFixed(8)}</td>
                  <td>{order.amount.toFixed(8)}</td>
                  <td>{order.total.toFixed(8)}</td>
                  <td>{order.sum.toFixed(8)}</td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  setAll(price, amount, total) {
    const {stock, pair} = this.props.data
    var key = `${stock}--${pair}--buy`
    CreateOrderStore.setPrice(price, key)
    CreateOrderStore.setAmount(amount, key)
    CreateOrderStore.setTotal(total, key)
    key = `${stock}--${pair}--sell`
    CreateOrderStore.setPrice(price, key)
    CreateOrderStore.setAmount(amount, key)
    CreateOrderStore.setTotal(total, key)
  }
  componentWillMount() {
    OrdersStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    OrdersStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    OrdersStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    OrdersStore.count(1, this.props.data)
  }
}

export default Orders
