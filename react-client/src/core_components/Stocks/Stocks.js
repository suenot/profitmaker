import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import CloseIcon from '@material-ui/icons/Close'

import StocksStore from 'stores/StocksStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Stocks extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Stocks</div>
          <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
        </div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(StocksStore.stocksComputed, (stock) => {
                return <tr key={stock.name} className="el-table__row">
                  <td><div className="cell" onClick={this.setStock.bind(this, stock.name)}>{stock.name}</div></td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  toggleFilter(e) {
    StocksStore.setStocksFilter(e.target.value)
  }
  setStock(stock) {
    var group = this.props.data.group
    DashboardsStore.setWidgetsData('stock', stock, group)
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
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Stocks
