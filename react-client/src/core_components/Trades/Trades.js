import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import TradesStore from '../../stores/TradesStore'

@observer
class Trades extends React.Component {
  render() {
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
            _.map(TradesStore.trades, (item, i) => {
              return (
                <tr key={item.id}>
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
  componentDidMount() {
    TradesStore.count(1)
  }
  componentWillUnmount() {
    TradesStore.count(-1)
  }
}

export default Trades
