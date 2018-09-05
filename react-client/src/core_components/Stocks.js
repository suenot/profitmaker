import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('GlobalStore')
@observer
class Stocks extends React.Component {
  render() {
    var colWidth = {
      width: 180
    }
    const {GlobalStore, type} = this.props
    return (
      <div>
        <div className="el-table el-table--fit noHeader-table">
          <div className="el-table__body-wrapper">
            <table className="el-table__body">

              <tbody>
                {
                  _.map(GlobalStore.stocks, (stock) => {
                    return <tr key={stock} lassName="el-table__row">
                      <td><div className="cell"><a href="#" onClick={this.handleClick.bind(this, stock.name)}>{stock.name}</a></div></td>
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
