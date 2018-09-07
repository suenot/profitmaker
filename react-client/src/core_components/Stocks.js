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
        <div className="el-table el-table--fit noHeader-table">
          <div className="el-table__body-wrapper">
            <table className="el-table__body">

              <tbody>
                {
                  _.map(GlobalStore.stocks, (stock) => {
                    return <tr key={stock.name} className="el-table__row">
                      <td><div className="cell" onClick={this.handleClick.bind(this, stock.name)}>{stock.name}</div></td>
                    </tr>
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
  handleClick(stock) {
    this.props.GlobalStore.setStock(stock)
  }
}

export default Stocks
