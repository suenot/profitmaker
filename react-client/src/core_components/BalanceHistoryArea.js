import React from 'react'
import _ from 'lodash'
import { inject, observer } from 'mobx-react'
import Preloader from './Preloader'
import ReactEcharts from 'echarts-for-react'

@inject('BalanceStore')
@observer
class BalancePie extends React.Component {
  render() {
    const {BalanceStore, data} = this.props
    const {total} = data
    var balanceData = total ? BalanceStore['balanceHistoryTotal'] : BalanceStore['balanceHistoryStock']
    // console.log(balanceData)
    // var legendData = []
    // var seriesData = []
    // var selected = {}
    // var totalUSD = balanceData.totalUSD
    // var otherUSD = 0
    if (JSON.stringify(balanceData) === '[]') {
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
        data: balanceData.coins
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
          data : balanceData.timestamps
        }
      ],
      yAxis : [
        {
          type : 'value'
        }
      ],
      series : balanceData.series
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
}

export default BalancePie
