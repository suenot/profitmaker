import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { Button } from 'element-react'
import moment from 'moment'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'
import axios from 'axios'
import Alert from 'react-s-alert'

@observer
class OpenOrders extends React.Component {
  state = {
    interval: '',
    hash: '',
    data: [],
    timer: 10000,
  }

  render() {
    const {stock, accountId, pair, demo} = this.props.data
    var data = this.state.data

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
      </div>
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
                <tr key={item._id}>
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
                      {/* <Button type="warning" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'], accountId)}>change</Button> */}
                      <Button type="danger" size="mini" onClick={this.cancelOrder.bind(this, item['data']['id'], item['data']['symbol'], item['data']['_id'], item['stock'], accountId)}>close</Button>
                    </Button.Group>
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
  cancelOrder(id, symbol, _id, stock, accountId) {
    var cancelMsg = stock + ': '+ symbol + ' canceling #' + id
    Alert.warning(cancelMsg)
    axios.post(`/user-api/cancelOrder/`, {
      id: id,
      _id: _id,
      symbol: symbol,
      stock: stock,
      accountId: accountId
    }).then((response) => {
      Alert.success('orderCanceled')
    }).catch((error) => {
      try {
        Alert.error(error.response.data.error)
      } catch(err) {
        Alert.error(JSON.stringify(error))
      }

    })
  }


  fetchOpenOrders(){
    var {stock, pair, accountId} = this.props.data
    axios.get(`/user-api/openOrders/${accountId}/${pair}`)
    .then((response) => {
      if (this.state.hash === JSON.stringify(response.data)) return true
      this.setState({
        hash: JSON.stringify(response.data)
      })
      this.setState({
        data: response.data
      })
    })
    .catch((error) => {
      this.setState({
        data: 'error'
      })
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchOpenOrders()
      }, this.state.timer)
    })
  }
  finish() {
    if (this.state.interval) {
      clearInterval(this.state.interval)
      this.setState({ interval: null })
    }
  }
  componentDidMount() {
    this.start()
  }
  componentWillUnmount() {
    this.finish()
  }
  // componentWillUpdate() {
  //   this.finish()
  // }
  // componentDidUpdate() {
  //   this.start()
  // }
}

export default OpenOrders
