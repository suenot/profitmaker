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
        <h5>Total</h5>
        <table>
          <thead>
            <tr>
              <th>name</th>
              <th>usd</th>
              <th>btc</th>
              <th>tkn</th>
            </tr>
          </thead>
          <tbody>
            {
              console.log(BalanceStore)
              // _.map(BalanceStore.total, (item, i) => {
              //   console.log(BalanceStore)
              //   return <tr>
              //     <td>{i}</td>
              //     <td>{item.usd}</td>
              //     <td>{item.btc}</td>
              //     <td>{item.tkn}</td>
              //   </tr>
              // })
            }
          </tbody>
        </table>

      </div>
    )
  }
}

export default Balance
