import React from 'react'
import { observer } from 'mobx-react'
import Preloader from '../Preloader'
import ReactEcharts from 'echarts-for-react'

import BalanceStore from 'stores/BalanceStore'

@observer
class BalancePie extends React.Component {
  render() {
    const {type, stock} = this.props.data
    const key = `${type}--${stock}`
    if (
        BalanceStore.balance[key] === undefined
        || JSON.stringify(BalanceStore.balance[key]) === '{}'
        || JSON.stringify(BalanceStore.balance[key].data) === '[]'
      ) {
      return <Preloader />
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
        data: BalanceStore.balance[key].coins
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
          data : BalanceStore.balance[key].timestamps
        }
      ],
      yAxis : [
        {
          type : 'value'
        }
      ],
      series : BalanceStore.balance[key].series
    }
    return (
      <ReactEcharts
        option={option}
        style={{width: '100%', height: '100%', position: 'absolute'}}
        className='react_for_echarts'
        theme={'light'}
      />
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

export default BalancePie
