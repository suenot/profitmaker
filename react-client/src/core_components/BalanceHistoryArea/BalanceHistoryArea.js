import React from 'react'
import { observer } from 'mobx-react'
import ReactEcharts from 'echarts-for-react'
import Preloader from 'core_components/Preloader'
import WidgetNotification from 'core_components/WidgetNotification'
import Demo from './Demo'
import axios from 'axios'

@observer
class BalancePie extends React.Component {
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

    var option = {
      tooltip : {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985'
          }
        }
      },
      legend: {
        data: data.coins
      },
      toolbox: {
        feature: {
          saveAsImage: {}
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis : [
        {
          type : 'category',
          boundaryGap : false,
          data : data.timestamps
        }
      ],
      yAxis : [
        {
          type : 'value'
        }
      ],
      series : data.series
    }
    return (
      <div>
        <ReactEcharts
          option={option}
          style={{width: '100%', height: '100%', position: 'absolute'}}
          className='react_for_echarts'
          theme={'light'}
        />
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

export default BalancePie
