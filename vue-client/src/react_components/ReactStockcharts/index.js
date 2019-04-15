import React from 'react'
import Chart from './Chart'
import './theme.sass'
import axios from 'axios'

class ChartComponent extends React.Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null,

    interval: null,
    tube: '',
    hash: '',
    data: [],
    timer: 5000,
    serverBackend: 'https://kupi.network',
    firstFetch: true,
  }

  componentDidCatch (error, info) {
    this.setState({ hasError: true, error, errorInfo: info })
  }

	render() {
    var data = this.state.data
    if (this.state.hasError) {
      return <div></div>
    } else {
      if (
        data === undefined ||
        JSON.stringify(data) === '[]' ||
        JSON.parse( JSON.stringify(data) ).length < 3 ) {
        return <div></div>
      } else {
        var ordersJSON = JSON.parse( JSON.stringify(data) )
        ordersJSON = ordersJSON.map(function(order){
          order.date = new Date(order.date)
          return order
        })
        return (
          <Chart type="hybrid" data={ordersJSON} _data={this.props.widget} height={471} />
        )
      }
    }
  }

  async fetchOhlcv_kupi(stockLowerCase, pair, timeframe) {
    return axios.get(`${this.state.serverBackend}/api/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.state.tube = 'ccxt'
      return []
    })
  }

  async fetchOhlcv_ccxt(stockLowerCase, pair, timeframe) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/candles/${pair}/${timeframe}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchOhlcv() {
    var stock = Store.stock
    var pair = Store.pair
    var timeframe = this.props.widget.timeframe
    var stockLowerCase = stock.toLowerCase()

    var data
    if (this.state.tube === 'ccxt') {
      data = await this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe)
    } else {
      if (this.state.firstFetch) {
        data = await Promise.race([
          this.fetchOhlcv_ccxt(stockLowerCase, pair, timeframe),
          this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
        ])
        this.setState({
          firstFetch: false
        })
      } else {
        data = await this.fetchOhlcv_kupi(stockLowerCase, pair, timeframe)
      }
    }
    if (this.state.hash === JSON.stringify(data)) return true
    this.setState({
      hash: JSON.stringify(data)
    })

    data = _.map(data, (item)=>{
      return {
        'date': new Date(item[0]),
        'open': item[1],
        'high': item[2],
        'low': item[3],
        'close': item[4],
        'volume': item[5],
        'absoluteChange': '',
        'dividend': '',
        'percentChange': '',
        'split': '',
      }
    })
    this.setState({
      data: data
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchOhlcv()
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
}


export default ChartComponent
