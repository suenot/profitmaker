import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'

@inject('OpenOrdersStore')
@observer
class OpenOrders extends React.Component {
  render() {
    const {OpenOrdersStore} = this.props
    return (
      <div>
        <h5>orders</h5>

        <table>
          <thead>
            <tr>
              <th>orderInfo</th>
              <th>priceInfo</th>
              <th>volumeInfo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
          {
            _.map(OpenOrdersStore.openOrders['BITFINEX']['XRP/BTC'], (item, i) => {
              return (
                <tr>
                  <td>
                    id: {item['id']}<br/>
                    status: {item['status']}<br/>
                    type: {item['type']}<br/>
                    side: {item['side']}<br/>
                    symbol:{item['symbol']}<br/>
                    date: {item['datetime']}<br/>
                  </td>
                  <td>
                    price: {item['price']}<br/>
                  </td>
                  <td>
                    amount: {item['amount']}<br/>
                    filled: {item['filled']}<br/>
                    remaining: {item['remaining']}<br/>
                    lastTrade: {item['lastTradeTimestamp']}
                  </td>
                  <td>
                    close<br/>
                    change
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

export default OpenOrders
