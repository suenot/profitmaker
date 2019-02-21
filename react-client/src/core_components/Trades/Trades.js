import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from '../Preloader'

import TradesStore from 'stores/TradesStore'

@observer
class Trades extends React.Component {
  render() {
    const {stock, pair} = this.props.data
    var key = `${stock}--${pair}`
    if (TradesStore.trades[key] === undefined) {
      return <Preloader />
    } else {
      return (
        <div>
          <table className="simpleTable">
            <thead>
              <tr>
                <th>price</th>
                <th>amount</th>
                <th>datetime</th>
              </tr>
            </thead>
            <tbody>
            {
              _.map(TradesStore.trades[key].slice(0, 40), (item) => {
                return (
                  <tr key={item.id}>
                    <td style={item.side === 'buy'?{color: '#ea0371'}:{color: '#83b327'}}>
                      <span >{item.price}</span>
                    </td>
                    <td>{item.amount}</td>
                    <td>{ moment(item.datetime).format('DD.MM.YY HH:mm:ss') }</td>
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
  componentWillMount() {
    TradesStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    TradesStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    TradesStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    TradesStore.count(1, this.props.data)
  }
}

export default Trades
