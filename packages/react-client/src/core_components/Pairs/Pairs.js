
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'
import axios from 'axios'

import DrawersStore from 'stores/DrawersStore'

@observer
class Pairs extends React.Component {
  state = {
    interval: '',
    tube: '',
    hash: '',
    data: [],
    timer: 1000,
    serverBackend: 'https://kupi.network',
    filter: '',
  }

  render() {
    var {stock, drawer} = this.props.data
    var data = this.state.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Pairs on {stock}</div>
          <CloseIcon onClick={this.drawerClose.bind(this, drawer)} className="pointer" />
        </div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px - 22px)'}}>
          <table className="simpleTable">
            <tbody>
              {
                _.map(data, (pair) => {
                  return <tr key={pair}>
                    <td>
                      <div className="cell" onClick={this.setPair.bind(this, pair)}>
                        {pair}
                      </div>
                    </td>
                  </tr>
                })
              }
            </tbody>
          </table>
        </PerfectScrollbar>
      </div>
    )
  }
  toggleFilter(e) {
    this.setState({
      filter: e.target.value
    })
    this.fetchPairs()
  }
  setPair(pair) {
    var group = this.props.data.group
    DashboardsStore.setWidgetsData('pair', pair, group)
  }

  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }

  async fetchPairs_kupi(stockLowerCase) {
    return axios.get(`${this.state.serverBackend}/api/${stockLowerCase}/pairs/`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      this.state.tube = 'ccxt'
      return []
    })
  }

  async fetchPairs_ccxt(stockLowerCase) {
    return axios.get(`/user-api/ccxt/${stockLowerCase}/pairs/`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchPairs() {
    const {stock} = this.props.data
    var stockLowerCase = stock.toLowerCase()
    var data
    if (this.state.tube === 'ccxt') {
      data = await this.fetchPairs_ccxt(stockLowerCase)
    } else {
      if (this.state.firstFetch) {
        data = await Promise.race([
          this.fetchPairs_ccxt(stockLowerCase),
          this.fetchPairs_kupi(stockLowerCase)
        ])
        this.setState({
          firstFetch: false
        })
      } else {
        data = await this.fetchPairs_kupi(stockLowerCase)
      }
    }

    data = data.map((pair) => {
      return pair.split('/').join('_')
    })

    data = data.filter((pair) => {
      return pair.toLowerCase().indexOf( this.state.filter.toLowerCase() ) !== -1
    })


    if (this.hash === JSON.stringify(data)) return true
    this.setState({
      hash: JSON.stringify(data)
    })

    this.setState({
      data: data
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchPairs()
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

export default Pairs
