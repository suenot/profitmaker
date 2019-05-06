import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from '../Preloader'
import axios from 'axios'

// import TradesStore from 'stores/TradesStore'

@observer
class Trades extends React.Component {
  state = {
    interval: '',
    tube: '',
    hash: '',
    data: [],
    timer: 1000,
    serverBackend: 'https://kupi.network'
  }

  render() {
    const {stock, pair} = this.props.data
    var key = `${stock}--${pair}`
    var data = this.state.data
    if (data === undefined) {
      return <Preloader />
    } else {
      return (
        <div>
          <table className="simpleTable">
            <thead>
              <tr>
                <th>price</th>
                <th>amount</th>
                <th>datetime</th>
              </tr>
            </thead>
            <tbody>
            {
              _.map(data.slice(0, 40), (item) => {
                return (
                  <tr key={item.id}>
                    <td style={item.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}}>
                      <span >{item.price}</span>
                    </td>
                    <td>{item.amount}</td>
                    <td>{ moment(item.datetime).format('DD.MM.YY HH:mm:ss') }</td>
                  </tr>
                )
              })
            }
            </tbody>
          </table>
        </div>
      )
    }
  }

  async fetchTrades_kupi(stockLowerCase, pair) {
    return axios.get(`${this.state.serverBackend}/api/${stockLowerCase}/trades/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.state.tube = 'ccxt'
      return []
    })
  }

  async fetchTrades_ccxt(stockLowerCase, pair) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/trades/${pair}`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchTrades(){
    const {stock, pair} = this.props.data
    var stockLowerCase = stock.toLowerCase()
    var key = `${stock}--${pair}`

    var data
    if (this.state.tube === 'ccxt') {
      data = await this.fetchTrades_ccxt(stockLowerCase, pair)
    } else {
      data = await this.fetchTrades_kupi(stockLowerCase, pair)
    }

    if (this.state.hash === JSON.stringify(data)) return true
    this.setState({
      hash: JSON.stringify(data)
    })
    data =  _.orderBy(data, ['timestamp'], ['desc'])

    this.setState({
      data: data
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchTrades()
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

export default Trades
