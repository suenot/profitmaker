import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'


import MyTradesStore from 'stores/MyTradesStore'

@observer
class MyTrades extends React.Component {
  render() {
    const {stock, pair, demo, accountId} = this.props.data
    var key = `${stock}--${pair}--${accountId}`
    var data = MyTradesStore.myTrades[key]
    data = data && data.slice(0, 100)

    if (demo) {
      data = Demo
    } else if (data === 'error') {
      return <div className="preloader-center">
        <WidgetNotification type="alert" msg="Can't get data"/>
        <Preloader />
      </div>
    } else if (data === undefined || _.isEmpty(data) || data.length === 0 ) {
      return <div className="preloader-center">
        <WidgetNotification type="info" msg="No data"/>
        <Preloader />
      </div>
    }

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
            _.map(data, (item) => {
              return (
                <tr key={item.uuid}>
                  <td>{item['order']}</td>
                  <td>{moment(item['datetime']).format('DD.MM.YY HH:mm:ss')}</td>
                  <td>{item['symbol']}</td>
                  <td>{item['type']}</td>
                  <td>{item['side']}</td>
                  <td>{item['price'].toFixed(8)}</td>
                  <td>{item['amount']}</td>
                  <td>{item['cost']}</td>
                  <td>{item['fee']['cost'].toFixed(8)} {item['fee']['currency']}</td>
                </tr>
              )
            })
          }
          </tbody>
        </table>
        { demo && <WidgetNotification type="warning" msg="Demo mode: using test data"/> }
      </div>
    )
  }
  componentWillMount() {
    MyTradesStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    MyTradesStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    MyTradesStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    MyTradesStore.count(1, this.props.data)
  }
}

export default MyTrades
