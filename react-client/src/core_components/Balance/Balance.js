import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'

import BalanceStore from 'stores/BalanceStore'

@observer
class Balance extends React.Component {
  render() {
    const {type, stock, demo} = this.props.data
    const key = `${type}--${stock}`
    var data = BalanceStore.balance[key]

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
              <th colSpan="1" className="simpleTable-header">{(data.datetime !== undefined) ? moment(data.datetime).format('DD.MM.YY HH:mm:ss') : '-'}</th>
              <th colSpan="1" className="simpleTable-header">{(data.totalBTC || 0).toFixed(8)} BTC</th>
              <th colSpan="2" className="simpleTable-header">{(data.totalUSD || 0).toFixed(2)} USD</th>
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
              _.map(data.data, (item) => {
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
        { demo && <WidgetNotification type="warning" msg="Demo mode: using test data"/> }
      </div>
    )
  }
  componentDidMount() {
    BalanceStore.count(1, this.props.data)
    // TODO: fix thix hack
    setTimeout(()=>{
      this.forceUpdate()
    }, 2000)
  }
  componentDidUpdate() {
    BalanceStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    BalanceStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    BalanceStore.count(-1, this.props.data)
  }
}

export default Balance
