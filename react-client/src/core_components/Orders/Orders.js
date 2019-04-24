import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'
import uuidv1 from 'uuid/v1'
import Preloader from '../Preloader'
import ReactDOM from 'react-dom'
import axios from 'axios'

import CoinsStore from 'stores/CoinsStore'
// import OrdersStore from 'stores/OrdersStore'
// import CreateOrderStore from 'stores/CreateOrderStore'
// import SettingsStore from 'stores/SettingsStore'

@observer
class Orders extends React.Component {
  constructor(props) {
    super(props)
    this.ordersCenter = React.createRef()
  }

  state = {
    interval: '',
    tube: '',
    hash: '',
    data: [],
    timer: 1000,
    serverBackend: 'https://kupi.network',
    center: false,
  }

  render() {
    const {type, stock, pair, visualMode, visualModeMax, visualModeCrocodileMax, visualModeWallsMax} = this.props.data
    var [coinFrom, coinTo] = pair.split('_')
    var key = `${stock}--${pair}`
    // var color = type === 'asks' ? 'rgba(255, 138, 138, 0.42)' : 'rgba(78, 136, 71, 0.42)'
    var data = this.state.data
    if (data === undefined || data['asks'] === undefined || data['bids'] === undefined) {
			return <Preloader />
    }
    var asks = data['asks'].slice(0, 30)
    if (type === 'both') {
      asks = _.reverse(_.clone(asks))
    }
    return (
      <div id={type === 'both' ? 'orders-both' : ''} className="kupi-pseudotable">
        <div className="pseudotable">

          { (type !== 'both') &&
            <div className="pseudotable-header">
                <div className="pseudotable-row">
                  <div style={{flex: '0 0 25%'}}>price <span className="muted">{coinTo}</span></div>
                  <div style={{flex: '0 0 25%'}}>amount <span className="muted">{coinFrom}</span></div>
                  <div style={{flex: '0 0 25%'}}>total <span className="muted">{coinTo}</span></div>
                  <div style={{flex: '0 0 25%'}}>sum <span className="muted">{coinTo}</span></div>
                </div>
            </div>
          }

          <div className="pseudotable-body">
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
                return <div className="pseudotable-row"
                  key={order.id + '--asks'}
                  onClick={this.setAll.bind(this, order.price, order.amount, order.total)}
                  style={{background: `linear-gradient(to right, #ffffff 0%, #ffffff ${percentInverseToFixed}%, ${color} ${percentInverseToFixed}%, ${color} 100%)`}}
                >
                  <div style={{flex: '0 0 25%'}}>{order.price.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}}>{order.amount.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}}>{order.total.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}}>{order.sum.toFixed(8)}</div>
                </div>
              })
            }

            { (type === 'both') &&
              <div className="pseudotable-header ">
                <div
                  className="pseudotable-row"
                  ref={this.ordersCenter}
                  >
                  <div style={{flex: '0 0 25%'}}>price  <span className="muted">{coinTo}</span></div>
                  <div style={{flex: '0 0 25%'}}>amount <span className="muted">{coinFrom}</span></div>
                  <div style={{flex: '0 0 25%'}}>total <span className="muted">{coinTo}</span></div>
                  <div style={{flex: '0 0 25%'}}>sum <span className="muted">{coinTo}</span></div>
                </div>
              </div>
            }

            {
              (type === 'both' || type === 'bids') &&
              _.map(data['bids'].slice(0, 30), (order) => {
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
                return <div
                  className="pseudotable-row"
                  key={order.id + '--bids'}
                  onClick={this.setAll.bind(this, order.price, order.amount, order.total)}
                  style={{background: `linear-gradient(to right, #ffffff 0%, #ffffff ${percentInverseToFixed}%, ${color} ${percentInverseToFixed}%, ${color} 100%)`}}
                >
                  <div style={{flex: '0 0 25%'}} >{order.price.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}} >{order.amount.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}} >{order.total.toFixed(8)}</div>
                  <div style={{flex: '0 0 25%'}} >{order.sum.toFixed(8)}</div>
                </div>
              })
            }
          </div>
        </div>
      </div>
    )
  }

  setAll(price, amount, total) {
    // const {stock, pair} = this.props.data

    // var key = `${stock}--${pair}--buy`
    // CreateOrderStore.setPrice(price, key)
    // CreateOrderStore.setAmount(amount, key)
    // CreateOrderStore.setTotal(total, key)

    // var key = `${stock}--${pair}--sell`
    // CreateOrderStore.setPrice(price, key)
    // CreateOrderStore.setAmount(amount, key)
    // CreateOrderStore.setTotal(total, key)
  }

  toCenter() {
    try {
      const {stock, pair} = this.props.data
      var data = this.state.data
      if (!(data === undefined || data['asks'] === undefined || data['bids'] === undefined)) {
        if (this.props.data.type === 'both') {
          var widgetHeight = ReactDOM.findDOMNode(this).parentNode.parentNode.parentNode.offsetHeight
          var top = this.ordersCenter.current.offsetTop
          ReactDOM.findDOMNode(this).parentNode.scrollTop = top - widgetHeight / 2 + 24
        }
      }
    } catch(err) {}
  }

  async fetchOrders_kupi(stockLowerCase, pair) {
    return axios.get(`${this.state.serverBackend}/api/${stockLowerCase}/orders/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.state.tube = 'ccxt'
      this.setState({
        timer: 3000*5
      })
      return {
        'asks': [],
        'bids': []
      }
    })
  }

  async fetchOrders_ccxt(stockLowerCase, pair) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/orders/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return {
        'asks': [],
        'bids': []
      }
    })
  }

  async fetchOrders() {
    const {stock, pair} = this.props.data
    var stockLowerCase = stock.toLowerCase()
    var data
    if (this.state.tube === 'ccxt') {
      data = await this.fetchOrders_ccxt(stockLowerCase, pair)
    } else {
      data = await this.fetchOrders_kupi(stockLowerCase, pair)
    }

    if (this.state.hash === JSON.stringify(data)) return true
    this.setState({
      hash: JSON.stringify(data)
    })

    var sum = {asks: 0, bids: 0}

    for( let type of Object.keys(sum) ) {
      if ( !_.isEmpty(data[type]) ) {
        for( let [key, order] of Object.entries(data[type]) ) {
          var price = order[0]
          var amount = order[1]
          var total = price * amount
          sum[type] = total + sum[type]
          data[type][key] = {
            id: uuidv1(),
            price: price,
            amount: amount,
            total: total,
            sum: sum[type]
          }
        }
        data[type] = _.forEach(data[type], (order)=>{
          order.totalPercent = order.total / sum[type] * 100
          order.sumPercent = order.sum / sum[type] * 100
          order.totalPercentInverse = 100 - order.totalPercent
          order.sumPercentInverse = 100 - order.sumPercent
        })
      }
    }
    this.setState({
      data: data
    })
    if (this.props.data.type === 'both' && !this.state.center) {
      setTimeout(()=>{
        this.toCenter()
        this.setState({
          center: true
        })
      }, 200)
    }
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchOrders()
      }, this.state.timer)
    })
  }
  finish() {
    if (this.state.interval) {
      clearInterval(this.state.interval)
      this.setState({ interval: null })
    }
  }
  componentDidMount() {
    this.start()
  }
  componentWillUnmount() {
    this.finish()
  }
  // componentWillUpdate() {
  //   this.finish()
  // }
  // componentDidUpdate() {
  //   this.start()
  // }
}

export default Orders
