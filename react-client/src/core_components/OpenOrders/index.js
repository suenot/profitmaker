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
                        id: {item['data']['id']}<br/>
                        status: {item['data']['status']}<br/>
                        type: {item['data']['type']}<br/>
                        side: {item['data']['side']}<br/>
                        symbol:{item['data']['symbol']}<br/>
                        date: {item['data']['datetime']}<br/>
                      </td>
                      <td>
                        price: {item['data']['price']}<br/>
                      </td>
                      <td>
                        amount: {item['data']['amount']}<br/>
                        filled: {item['data']['filled']}<br/>
                        remaining: {item['data']['remaining']}<br/>
                        lastTrade: {item['data']['lastTradeTimestamp']}
                      </td>
                      <td>
                        <button onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], OpenOrdersStore.stock)}>close</button>

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
  cancelOrder(id, symbol, _id, stock, e) {
    this.props.OpenOrdersStore.cancelOrder(id, symbol, _id, stock)
  }
}

export default OpenOrders
