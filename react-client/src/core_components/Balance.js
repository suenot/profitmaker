import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import BalanceStore from '../stores/BalanceStore'

@observer
class Balance extends React.Component {
  render() {
    const {data} = this.props
    const {total} = data
    if (!BalanceStore.stock) {
      return (<div></div>)
    }
    var balanceData = total ? BalanceStore['balanceTotal'] : BalanceStore['balanceStock']
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th colSpan="1" className="simpleTable-header">{(balanceData.datetime && moment(balanceData.datetime).format('DD.MM.YY HH:mm:ss')) || '-'}</th>
              <th colSpan="1" className="simpleTable-header">{(balanceData.totalBTC || 0).toFixed(8)} BTC</th>
              <th colSpan="2" className="simpleTable-header">{(balanceData.totalUSD || 0).toFixed(2)} USD</th>
            </tr>
            <tr>
              <th>coins</th>
              <th>on orders</th>
              <th>BTC</th>
              <th>USD</th>
            </tr>
          </thead>
          <tbody>
            {
              _.map(balanceData.data, (item) => {
                return (
                  <tr key={item.shortName}>
                    <td>
                      {(item.free || 0).toFixed(8)} {item.shortName}
                    </td>
                    <td>
                      {(item.used || 0).toFixed(8)}
                    </td>
                    <td>
                      {(item.totalBTC || 0).toFixed(8)}
                    </td>
                    <td>
                      {(item.totalUSD || 0).toFixed(2)}
                    </td>
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
    BalanceStore.count(1)
  }
  componentWillUnmount() {
    BalanceStore.count(-1)
  }
}

export default Balance
