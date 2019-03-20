import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'

import StocksStore from 'stores/StocksStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Stocks extends React.Component {
  render() {
    var {drawer} = this.props.data
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
                _.map(StocksStore.stocksComputed, (stock) => {
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
    StocksStore.setStocksFilter(e.target.value)
  }
  setStock(stock, accountName, accountId) {
    var group = this.props.data.group
    DashboardsStore.setWidgetsData('stock', stock, group)
    if (accountName === undefined) accountName = ''
    DashboardsStore.setWidgetsData('accountName', accountName, group)
    if (accountId === undefined) accountId = ''
    DashboardsStore.setWidgetsData('accountId', accountId, group)
  }
  componentWillMount() {
    StocksStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    StocksStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    StocksStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    StocksStore.count(1, this.props.data)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Stocks
