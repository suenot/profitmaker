import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import moment from 'moment'

@inject('RawTradesStore')
@observer
class RawTrades extends React.Component {
  render() {
    const {RawTradesStore} = this.props
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th>price</th>
              <th>amount</th>
              <th>datetime</th>
            </tr>
          </thead>
          <tbody>
          {
            _.map(RawTradesStore.rawTrades, (item, i) => {
              return (
                <tr key={item.uuid}>
                  <td style={item.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}}>
                    <span >{item.price}</span>
                  </td>
                  <td>{item.amount}</td>
                  <td>{ moment(item.datetime).format('DD.MM.YY HH:mm:ss') }</td>
                </tr>
              )
            })
          }
          </tbody>
        </table>
      </div>
    )
  }
}

export default RawTrades
