import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from '../Preloader'

import BalanceStore from 'stores/BalanceStore'

@observer
class Balance extends React.Component {
  render() {
    const {type, stock} = this.props.data
    const key = `${type}--${stock}`
    // console.log( JSON.stringify(BalanceStore.balance[key]) )
    if (BalanceStore.balance[key] === undefined) {
      return <Preloader />
    }
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th colSpan="1" className="simpleTable-header">{(BalanceStore.balance[key].datetime !== undefined) ? moment(BalanceStore.balance[key].datetime).format('DD.MM.YY HH:mm:ss') : '-'}</th>
              <th colSpan="1" className="simpleTable-header">{(BalanceStore.balance[key].totalBTC || 0).toFixed(8)} BTC</th>
              <th colSpan="2" className="simpleTable-header">{(BalanceStore.balance[key].totalUSD || 0).toFixed(2)} USD</th>
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
              _.map(BalanceStore.balance[key].data, (item) => {
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
