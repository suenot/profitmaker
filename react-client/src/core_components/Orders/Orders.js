import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'
import Preloader from '../Preloader'
import ReactDOM from 'react-dom'

import CoinsStore from 'stores/CoinsStore'
import OrdersStore from 'stores/OrdersStore'
import CreateOrderStore from 'stores/CreateOrderStore'

@observer
class Orders extends React.Component {
  render() {
    const {type, stock, pair, visualMode, visualModeMax, visualModeCrocodileMax, visualModeWallsMax} = this.props.data
    var [coinFrom, coinTo] = pair.split('_')
    var key = `${stock}--${pair}`
    // var color = type === 'asks' ? 'rgba(255, 138, 138, 0.42)' : 'rgba(78, 136, 71, 0.42)'
    if (OrdersStore.orders[key] === undefined || OrdersStore.orders[key]['asks'] === undefined || OrdersStore.orders[key]['bids'] === undefined) {
			return <Preloader />
    }
    var asks = OrdersStore.orders[key]['asks'].slice(0, 30)
    if (type === 'both') {
      asks = _.reverse(_.clone(asks))
    }
    return (
      <div id={type === 'both' ? 'orders-both' : ''}>
        <table className="simpleTable">

          { (type !== 'both') &&
            <thead>
                <tr>
                  <th className="simpleTable-header">price <span className="muted">{coinTo}</span></th>
                  <th className="simpleTable-header">amount <span className="muted">{coinFrom}</span></th>
                  <th className="simpleTable-header">total <span className="muted">{coinTo}</span></th>
                  <th className="simpleTable-header">sum <span className="muted">{coinTo}</span></th>
                </tr>
            </thead>
          }

          <tbody>
            {
              (type === 'both' || type === 'asks') &&
              _.map(asks, (order) => {
                // var _type = 'asks'
                var percent = 0
                var color = 'rgba(255, 138, 138, 0.42)'
                if (visualMode !== 'none') {
                  if (visualModeMax === 'total sum') {
                    percent = visualMode === 'crocodile' ? order.sumPercent : order.totalPercent
                  } else { // fixed
                    if (visualMode === 'crocodile') {
                      var visualModeCrocodileMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (visualModeCrocodileMax / CoinsStore.coins[coinTo].price_usd) : 30
                      if (visualModeCrocodileMaxInQuote >= order.total) percent = 100
                      percent = order.sum / visualModeCrocodileMaxInQuote * 100
                    } else { // wall
                      var visualModeWallsMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (visualModeWallsMax / CoinsStore.coins[coinTo].price_usd) : 1
                      if (visualModeWallsMaxInQuote >= order.total) percent = 100
                      percent = order.total / visualModeWallsMaxInQuote * 100
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

            { (type === 'both') &&
              <tr
                className="orders-center"
                ref={input => {
                  this.ordersCenter = input;
                }}
                >
                <th className="simpleTable-header">price <span className="muted">{coinTo}</span></th>
                <th className="simpleTable-header">amount <span className="muted">{coinFrom}</span></th>
                <th className="simpleTable-header">total <span className="muted">{coinTo}</span></th>
                <th className="simpleTable-header">sum <span className="muted">{coinTo}</span></th>
              </tr>
            }

            {
              (type === 'both' || type === 'bids') &&
              _.map(OrdersStore.orders[key]['bids'].slice(0, 30), (order) => {
                var percent = 0
                var color = 'rgba(78, 136, 71, 0.42)'

                if (visualMode !== 'none') {
                  if (visualModeMax === 'total sum') {
                    percent = visualMode === 'crocodile' ? order.sumPercent : order.totalPercent
                  } else { // fixed
                    if (visualMode === 'crocodile') {
                      var visualModeCrocodileMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (visualModeCrocodileMax / CoinsStore.coins[coinTo].price_usd) : 30
                      if (visualModeCrocodileMaxInQuote >= order.total) percent = 100
                      percent = order.sum / visualModeCrocodileMaxInQuote * 100
                    } else { // wall
                      var visualModeWallsMaxInQuote = (CoinsStore.coins[coinTo] && CoinsStore.coins[coinTo].price_usd) ? (visualModeWallsMax / CoinsStore.coins[coinTo].price_usd) : 1
                      if (visualModeWallsMaxInQuote >= order.total) percent = 100
                      percent = order.total / visualModeWallsMaxInQuote * 100
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

    var key = `${stock}--${pair}--sell`
    CreateOrderStore.setPrice(price, key)
    CreateOrderStore.setAmount(amount, key)
    CreateOrderStore.setTotal(total, key)
  }

  toCenter() {
    try {
      const {stock, pair} = this.props.data
      var key = `${stock}--${pair}`
      if (!(OrdersStore.orders[key] === undefined || OrdersStore.orders[key]['asks'] === undefined || OrdersStore.orders[key]['bids'] === undefined)) {
        if (this.props.data.type === 'both') {
          var widgetHeight = ReactDOM.findDOMNode(this).parentNode.parentNode.parentNode.offsetHeight
          var top = ReactDOM.findDOMNode(this).querySelector('.orders-center').offsetTop
          ReactDOM.findDOMNode(this).parentNode.scrollTop = top - widgetHeight / 2 + 24
        }
      }
    } catch(err) {}
  }
  componentDidMount() {
    this.toCenter()
  }

  componentWillMount() {
    OrdersStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    OrdersStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    OrdersStore.count(-1, this.props.data)
    this.toCenter()
  }
  componentDidUpdate() {
    OrdersStore.count(1, this.props.data)
  }
}

export default Orders
