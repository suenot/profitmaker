import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'
import axios from 'axios'

@observer
class Balance extends React.Component {
  state = {
    interval: '',
    hash: '',
    data: [],
    timer: 10000,

    precision: 8,
  }

  render() {
    const {demo} = this.props.data
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

  fetchBalance(){
    var {stock, type, accountId} = this.props.data
    const key = `${type}--${stock}--${accountId}`
    axios.post(`/user-api/balance/`, {
      type, key, stock, accountId
    })
    .then(response => {
      if (this.state.hash === JSON.stringify(response.data)) return true
      this.setState({
        hash: JSON.stringify(response.data),
        data: response.data
      })
    })
    .catch(error => {
      this.setState({
        data: 'error'
      })
    })
  }

  start() {
    this.setState({
      interval: setInterval(()=>{
        this.fetchBalance()
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

export default Balance
