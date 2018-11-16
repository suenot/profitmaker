import React from 'react'
import { observer } from 'mobx-react'
import Preloader from '../Preloader'
import ReactEcharts from 'echarts-for-react'
import BalanceStore from '../../stores/BalanceStore'

@observer
class BalancePie extends React.Component {
  render() {
    const {data} = this.props
    const {total} = data
    var balanceData = total ? BalanceStore['balanceTotal'] : BalanceStore['balanceStock']
    var legendData = []
    var seriesData = []
    var selected = {}
    var totalUSD = balanceData.totalUSD
    var otherUSD = 0
    if (JSON.stringify(balanceData.data) === '[]') {
      return <Preloader />
    }
    balanceData.data.forEach(function(coin){
      if (coin.totalUSD !== 0) {
        if ( (coin.totalUSD/totalUSD*100 ) > 5) {
          seriesData.push({
            name: coin.shortName,
            value: coin.totalUSD.toFixed(8)
          })
          legendData.push(coin.shortName)
          selected[coin.shortName] = true
        } else {
          otherUSD += coin.totalUSD
        }
      }
    })
    if (otherUSD !==0) {
      seriesData.push({
        name: 'Other',
        value: otherUSD.toFixed(8)
      })
    }
    selected['Other'] = true
    legendData.push('Other')
    var optionData = {
      legendData,
      seriesData,
      selected
    }
    var option = {
      tooltip : {
          trigger: 'item',
          formatter: "{a} <br/>{b} : {c} ({d}%)"
      },
      legend: {
          type: 'scroll',
          orient: 'vertical',
          right: 10,
          top: 20,
          bottom: 20,
          data: optionData.legendData,
          selected: optionData.selected
      },
      series : [
          {
              name: 'balance',
              type: 'pie',
              radius : '55%',
              center: ['40%', '50%'],
              data: optionData.seriesData,
              itemStyle: {
                  emphasis: {
                      shadowBlur: 10,
                      shadowOffsetX: 0,
                      shadowColor: 'rgba(0, 0, 0, 0.5)'
                  }
              }
          }
      ]
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
    if (this.props.data.total === true ) {
      BalanceStore.count(1, 'balanceTotal_counter')
    } else {
      BalanceStore.count(1, 'balanceStock_counter')
    }
  }
  componentDidUpdate() {
    if (this.props.data.total === true ) {
      BalanceStore.count(1, 'balanceTotal_counter')
    } else {
      BalanceStore.count(1, 'balanceStock_counter')
    }
  }
  componentWillUnmount() {
    if (this.props.data.total === true ) {
      BalanceStore.count(-1, 'balanceTotal_counter')
    } else {
      BalanceStore.count(-1, 'balanceStock_counter')
    }
  }
  componentWillUpdate() {
    if (this.props.data.total === true ) {
      BalanceStore.count(-1, 'balanceTotal_counter')
    } else {
      BalanceStore.count(-1, 'balanceStock_counter')
    }
  }
}

export default BalancePie
