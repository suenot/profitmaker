import React from 'react'
import _ from 'lodash'
import axios from 'axios'
import uuidv1 from 'uuid/v1'
import { observer } from 'mobx-react'
import moment from 'moment'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'


@observer
class MyTrades extends React.Component {
  state = {
    interval: '',
    hash: '',
    data: [],
    timer: 5000,
  }

  render() {
    const {demo} = this.props.data
    var data = this.state.data
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

  fetchMyTrades() {
    const {pair, accountId} = this.props.data
    axios.get(`/user-api/myTrades/${accountId}/${pair}`)
    .then((response) => {
      if (this.state.hash === JSON.stringify(response.data)) return true
      this.setState({
        hash: JSON.stringify(response.data)
      })
      var myTrades = response.data
      myTrades = myTrades.map((trade)=>{
        trade.uuid = uuidv1()
        return trade
      })
      this.setState({
        data: myTrades
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
        this.fetchMyTrades()
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

export default MyTrades
