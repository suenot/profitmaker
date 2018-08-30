import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('MyTradesStore')
@observer
class MyTrades extends React.Component {
  render() {
    const {MyTradesStore} = this.props
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
            _.map(MyTradesStore.myTrades['BITFINEX']['XRP/BTC'], (item, i) => {
              return (
                <tr>
                  <td>
                    id: {item['order']}<br/>
                    date: {item['datetime']}<br/>
                    symbol:{item['symbol']}<br/>
                    type: {item['type']}<br/>
                    side: {item['side']}
                  </td>
                  <td>
                    price: {item['price']}<br/>
                    amount: {item['amount']}<br/>
                    cost: {item['cost']}<br/>
                    fee: {item['fee']['cost']} {item['fee']['currency']}
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

export default MyTrades
