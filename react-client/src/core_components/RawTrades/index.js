import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('RawTradesStore')
@observer
class RawTrades extends React.Component {
  render() {
    const {RawTradesStore} = this.props
    return (
      <div>
        <h5>orders</h5>

        <table>
          <thead>
            <tr>
              <th>orderInfo</th>
              <th>tradeInfo</th>
            </tr>
          </thead>
          <tbody>
          {
            _.map(RawTradesStore.rawTrades, (item, i) => {
              return (
                <tr>
                  
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
