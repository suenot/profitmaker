import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'

@observer
class Intuition extends React.Component {
  render() {
    ["BITTREX_LTC_USD_CEX_LTC_USD_buy","BITTREX_LTC_USD","CEX_LTC_USD","buy","3.73","565.97",1542539200]
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th className="simpleTable-header">Amount</th>
              <th className="simpleTable-header">Profit</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
    )
  }
}

export default Intuition
