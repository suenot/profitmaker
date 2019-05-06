import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'
import axios from 'axios'

// import StocksStore from 'stores/StocksStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'
import KeysStore from 'stores/KeysStore'

@observer
class Stocks extends React.Component {
  state = {
    interval: '',
    hash: '',
    data: [],
    timer: 1000,
    serverBackend: 'https://kupi.network',
    filter: '',
  }

  render() {
    var {drawer} = this.props.data
    var data = this.state.dataComputed
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Stocks</div>
          <CloseIcon onClick={this.drawerClose.bind(this, drawer)} className="pointer" />
        </div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px - 22px)'}}>
          <table className="simpleTable">
            <tbody>
              {
                _.map(data, (stock) => {
                  return <tr key={stock.id} className="el-table__row">
                    <td><div className="cell stocks-cell" onClick={this.setStock.bind(this, stock.name, stock.accountName, stock.accountId)}><span>{stock.name}</span> <span className="muted">{stock.accountName}</span></div></td>
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
    this.fetchStocks()
  }
  setStock(stock, accountName, accountId) {
    var group = this.props.data.group
    DashboardsStore.setWidgetsData('stock', stock, group)
    if (accountName === undefined) accountName = ''
    DashboardsStore.setWidgetsData('accountName', accountName, group)
    if (accountId === undefined) accountId = ''
    DashboardsStore.setWidgetsData('accountId', accountId, group)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }

  async fetchStocks_kupi() {
    return axios.get(`${this.state.serverBackend}/api/stocks`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchStocks_ccxt() {
    return axios.get(`/user-api/ccxt/stocks`)
    .then((response) => {
      return response.data
    })
    .catch(() => {
      return []
    })
  }

  async fetchStocks() {
    // create empty vars
    var kupiStocks = await this.fetchStocks_kupi()
    var ccxtStocks = await this.fetchStocks_ccxt()
    // add rateLimit to kupiStocks
    for (let kupiStock of kupiStocks) {
      if (kupiStock.rateLimit === undefined) {
        var _stock = _.find(ccxtStocks, function(ccxtStock) {
          return ccxtStock.name == kupiStock.name
        })
        if (_stock !== undefined) {
          kupiStock.rateLimit = _stock.rateLimit
        }
      }
    }
    // combine lists
    var stocks = _.uniqBy([...kupiStocks, ...ccxtStocks], 'name')
    // write to state
    this.setState({
      data: stocks
    })
    // run computed
    this.stocksComputed()
  }

  stocksComputed() {
    var data = []
    var stocks = _.clone(this.state.data)
    stocks = stocks.filter((stock) => {
      return stock.name.toLowerCase().indexOf( this.state.filter.toLowerCase() ) !== -1
    })
    for (let stock of stocks) {
      data.push({
        id: stock.name,
        name: stock.name,
        kupi: stock.kupi || false,
        ccxt: stock.ccxt || false,
        rateLimit: stock.rateLimit || 3000
      })
      for (let account of Object.values(KeysStore.accounts)) {
        if (account.stock.toUpperCase() === stock.name) {
          data.push({
            id: `${stock.name}--${account.id}`,
            name: stock.name,
            accountId: account.id,
            accountName: account.name,
            kupi: stock.kupi || false,
            ccxt: stock.ccxt || false,
            rateLimit: stock.rateLimit || 3000
          })
        }
      }
    }
    // compare hash
    if (this.state.hash === JSON.stringify(data)) {
      return true
    }
    this.setState({
      hash: JSON.stringify(data),
      dataComputed: data
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchStocks()
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

export default Stocks
