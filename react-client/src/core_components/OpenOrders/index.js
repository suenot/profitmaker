import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('OpenOrdersStore')
@observer
class OpenOrders extends React.Component {
  render() {
    var colWidth = {
      width: 220
    }
    const {OpenOrdersStore} = this.props
    return (
      <div>
        <div className="el-table el-table--fit el-table--enable-row-hover myTrades-table">
          <div className="el-table__header-wrapper">
            <table classMane="el-table__header">
              <thead>
                <tr>
                  <th className="is-leaf" style={colWidth}><div className="cell">orderInfo</div></th>
                  <th className="is-leaf" style={colWidth}><div className="cell">priceInfo</div></th>
                  <th className="is-leaf" style={colWidth}><div className="cell">volumeInfo</div></th>
                  <th className="is-leaf" style={colWidth}><div className="cell"></div></th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="el-table__body-wrapper">
            <table className="el-table__body">
              <tbody>
              {
                _.map(OpenOrdersStore.openOrders, (item, i) => {
                  return (
                    <tr>
                      <td>
                        id: {item['id']}<br/>
                        status: {item['status']}<br/>
                        type: {item['type']}<br/>
                        side: {item['side']}<br/>
                        symbol:{item['symbol']}<br/>
                        date: {item['datetime']}<br/>
                      </td>
                      <td>
                        price: {item['price']}<br/>
                      </td>
                      <td>
                        amount: {item['amount']}<br/>
                        filled: {item['filled']}<br/>
                        remaining: {item['remaining']}<br/>
                        lastTrade: {item['lastTradeTimestamp']}
                      </td>
                      <td>
                        close<br/>
                        change
                      </td>

                    </tr>
                  )
                })


              }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
}

export default OpenOrders
