import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import { Link } from "react-router-dom"

@inject('OrdersStore')
@observer
class Pairs extends React.Component {
  render() {
    const {OrdersStore, type} = this.props
    return (
      <div>
        <table>
          <tbody>
            {
              _.map(OrdersStore.pairs, (pair) => {
                return <tr key={pair}>
                  <td><a href="#" onClick={this.handleClick.bind(this, pair)}>{pair}</a></td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  handleClick(pair) {
    this.props.OrdersStore.setPair(pair)
  }
}

export default Pairs
