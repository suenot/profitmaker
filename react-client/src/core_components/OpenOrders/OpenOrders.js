import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { Button } from 'element-react'
import moment from 'moment'
import Demo from './Demo'

import OpenOrdersStore from 'stores/OpenOrdersStore'

@observer
class OpenOrders extends React.Component {
  render() {
    const {stock, pair} = this.props.data
    var key = `${stock}--${pair}`
    var data = OpenOrdersStore.openOrders[key]
    var demoMode = false
    if (data === undefined || _.isEmpty(data) || data.length === 0 ) {
      data = Demo
      demoMode = true
    }
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th>id</th>
              <th>status</th>
              <th>type</th>
              <th>side</th>
              <th>symbol</th>
              <th>date</th>
              <th>price</th>
              <th>amount</th>
              <th>filled</th>
              <th>remaining</th>
              <th>lastTrade</th>
              <th>action</th>
            </tr>
          </thead>
          <tbody>
          {
            _.map(data, (item, i) => {
              return (
                <tr>
                  <td>{item['data']['id'] || ""}</td>
                  <td>{item['data']['status'] || ""}</td>
                  <td>{item['data']['type'] || ""}</td>
                  <td>{item['data']['side'] || ""}</td>
                  <td>{item['data']['symbol'] || ""}</td>
                  <td>{moment(item['data']['datetime']).format('DD.MM.YY HH:mm:ss') || ""}</td>
                  <td>{item['data']['price'] || ""}</td>
                  <td>{item['data']['amount'] || ""}</td>
                  <td>{item['data']['filled'] || ""}</td>
                  <td>{item['data']['remaining'] || ""}</td>
                  <td>
                    { ( item['data']['lastTradeTimestamp'] && moment(item['data']['lastTradeTimestamp']).format('DD.MM.YY HH:mm:ss') ) || 'None'}
                  </td>
                  <td>
                    <Button.Group>
                      <Button type="warning" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'])}>change</Button>
                      <Button type="danger" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'])}>close</Button>
                    </Button.Group>
                  </td>
                </tr>
              )
            })
          }
          </tbody>
        </table>
        { demoMode && <div className="demo">Demo mode: needed API key</div> }
      </div>
    )
  }
  cancelOrder(id, symbol, _id, stock, e) {
    OpenOrdersStore.cancelOrder(id, symbol, _id, stock)
  }
  componentWillMount() {
    OpenOrdersStore.count(1, this.props.data)
  }
  componentWillUnmount() {
    OpenOrdersStore.count(-1, this.props.data)
  }
  componentWillUpdate() {
    OpenOrdersStore.count(-1, this.props.data)
  }
  componentDidUpdate() {
    OpenOrdersStore.count(1, this.props.data)
  }
}

export default OpenOrders
