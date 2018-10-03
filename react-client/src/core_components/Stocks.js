import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import GlobalStore from '../stores/GlobalStore'
@observer
class Stocks extends React.Component {
  render() {
    return (
      <div>
        <input className="simpleSearch" onChange={this.toggleFilter.bind(this)}/>
        <table className="simpleTable">
          <tbody>
            {
              _.map(GlobalStore.stocksComputed, (stock) => {
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
    GlobalStore.setStocksFilter(e.target.value)
  }
  setStock(stock) {
    GlobalStore.setStock(stock)
  }
}

export default Stocks
