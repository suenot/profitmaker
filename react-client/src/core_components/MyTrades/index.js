import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import moment from 'moment'

@inject('MyTradesStore')
@observer
class MyTrades extends React.Component {

  render() {
    
    const {MyTradesStore} = this.props
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th>id</th>
              <th>date</th>
              <th>symbol</th>
              <th>type</th>
              <th>side</th>
              <th>price</th>
              <th>amount</th>
              <th>cost</th>
              <th>fee</th>
            </tr>
          </thead>
          <tbody>
          {
            _.map(MyTradesStore.myTrades, (item, i) => {
              return (
                <tr key={item.uuid}>
                  <td>{item['order']}</td>
                  <td>{moment(item['datetime']).format('DD.MM.YY HH:mm:ss')}</td>
                  <td>{item['symbol']}</td>
                  <td>{item['type']}</td>
                  <td>{item['side']}</td>
                  <td>{item['price']}</td>
                  <td>{item['amount']}</td>
                  <td>{item['cost']}</td>
                  <td>{item['fee']['cost']} {item['fee']['currency']}</td>
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
