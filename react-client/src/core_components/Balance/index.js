import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('BalanceStore')
@observer
class Balance extends React.Component {
  render() {
    const {BalanceStore} = this.props
    return (
      <div>
        <h5>{BalanceStore.stock}</h5>
        <h6>freeBTC: {BalanceStore.balance[BalanceStore.stock].freeBTC}</h6>
        <h6>freeUSD: {BalanceStore.balance[BalanceStore.stock].freeUSD}</h6>
        <h6>usedBTC: {BalanceStore.balance[BalanceStore.stock].usedBTC}</h6>
        <h6>usedUSD: {BalanceStore.balance[BalanceStore.stock].usedUSD}</h6>
        <h6>totalBTC: {BalanceStore.balance[BalanceStore.stock].totalBTC}</h6>
        <h6>totalUSD: {BalanceStore.balance[BalanceStore.stock].totalUSD}</h6>

        <table>
          <thead>
            <tr>
              <th>name</th>
              <th>free</th>
              <th>used</th>
              <th>total</th>
            </tr>
          </thead>
          <tbody>
            {

              _.map(BalanceStore.balance[BalanceStore.stock].data, (item, i) => {

                return (
                  <tr>
                    <td>{i}</td>
                    <td>
                      tkn: {item.free.toFixed(BalanceStore.precision)}<br/>
                      usd: {item.freeUSD.toFixed(BalanceStore.precision)}<br/>
                      btc: {item.freeBTC.toFixed(BalanceStore.precision)}
                    </td>
                    <td>
                      tkn: {item.used.toFixed(BalanceStore.precision)}<br/>
                      usd: {item.usedUSD.toFixed(BalanceStore.precision)}<br/>
                      btc: {item.usedBTC.toFixed(BalanceStore.precision)}
                    </td>
                    <td>
                      tkn: {item.total.toFixed(BalanceStore.precision)}<br/>
                      usd: {item.totalUSD.toFixed(BalanceStore.precision)}<br/>
                      btc: {item.totalBTC.toFixed(BalanceStore.precision)}
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
}

export default Balance
