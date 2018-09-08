import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import moment from 'moment'

@inject('RawTradesStore')
@observer
class RawTrades extends React.Component {
  render() {
    var colWidth = {
      width: 220
    }
    const {RawTradesStore} = this.props
    return (
      <div>
        <div className="el-table el-table--fit el-table--enable-row-hover myTrades-table no-thead">
          <div className="el-table__body-wrapper">
            <table className="el-table__body">
              <tbody>
              {
                _.map(RawTradesStore.rawTrades, (item, i) => {
                  return (
                    <tr className="el-table__row"  key={item.uuid}>
                      <td style={colWidth}>
                        <div className="cell">
                          <span style={item.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}}>{item.price}</span>

                        </div>
                      </td>
                      <td style={colWidth}>
                        <div className="cell">
                          {item.amount}
                        </div>
                      </td>
                      <td style={colWidth}>
                        <div className="cell">
                          { moment(item.datetime).format('DD.MM.YY HH:mm:ss') }
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

export default RawTrades
