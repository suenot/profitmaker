import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('GlobalStore')
@observer
class Stocks extends React.Component {
  render() {
    const {GlobalStore} = this.props
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
    this.props.GlobalStore.setStocksFilter(e.target.value)
  }
  setStock(stock) {
    this.props.GlobalStore.setStock(stock)
  }
}

export default Stocks
