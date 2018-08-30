import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import { Link } from "react-router-dom"

@inject('OrdersStore')
@observer
class Stocks extends React.Component {
  render() {
    const {OrdersStore, type} = this.props
    return (
      <div>
        <table>
          <tbody>
            {
              _.map(OrdersStore.stocks, (stock) => {
                return <tr key={stock}>
                  <td><a href="#" onClick={this.handleClick.bind(this, stock.name)}>{stock.name}</a></td>
                </tr>
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  handleClick(stock) {
    this.props.OrdersStore.setStock(stock)
  }
}

export default Stocks
