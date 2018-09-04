import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('MyTradesStore')
@observer
class MyTrades extends React.Component {

  render() {
    var colWidth = {
      width: 220
    }
    const {MyTradesStore} = this.props
    return (
      <div>
        <div className="el-table el-table--fit el-table--enable-row-hover myTrades-table">
          <div className="el-table__header-wrapper">
            <table classMane="el-table__header">
              <thead>
                <tr>
                  <th className="is-leaf" style={colWidth}><div className="cell">orderInfo</div></th>
                  <th className="is-leaf" style={colWidth}><div className="cell">tradeInfo</div></th>
                </tr>
              </thead>
            </table>
          </div>
          <div className="el-table__body-wrapper">
            <table className="el-table__body">
              <tbody>
              {
                _.map(MyTradesStore.myTrades, (item, i) => {
                  return (
                    <tr className="el-table__row">
                      <td style={colWidth}>
                        <div className="cell">
                          id: {item['order']}<br/>
                          date: {item['datetime']}<br/>
                          symbol:{item['symbol']}<br/>
                          type: {item['type']}<br/>
                          side: {item['side']}
                        </div>
                      </td>
                      <td style={colWidth}>
                        <div className="cell">
                          price: {item['price']}<br/>
                          amount: {item['amount']}<br/>
                          cost: {item['cost']}<br/>
                          fee: {item['fee']['cost']} {item['fee']['currency']}
                        </div>
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

export default MyTrades
