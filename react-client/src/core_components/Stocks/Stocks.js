import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'

import StocksStore from 'stores/StocksStore'
import DashboardsStore from 'stores/DashboardsStore'

@observer
class Stocks extends React.Component {
  render() {
    return (
      <div>
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
}

export default Stocks
