import React from 'react';
import { inject, observer } from 'mobx-react'
import HighchartsReact from 'highcharts-react-official'

const Highstocks = require('highcharts/highstock')

@inject('OhlcvStore')
@observer
export default class HightstockWithPreloader extends React.Component {
  render() {
    const {OhlcvStore} = this.props
    var JSONdata = JSON.parse( JSON.stringify(OhlcvStore.ohlcv) )
    var options = {
      width: '500px',
      rangeSelector: {
        selected: 1
      },
      title: {
        text: 'AAPL Stock Price'
      },
      series: [{
        type: 'candlestick',
        name: 'AAPL Stock Price',
        data: JSONdata,
        dataGrouping: {
          units: [
            [
              'week', // unit name
              [1] // allowed multiples
            ], [
              'month',
              [1, 2, 3, 4, 6]
            ]
          ]
        }
      }]
    }
    return (
      <div>
        <style jsx="true">{`
          .container {
            min-width: 100%; width: 100%; height: 400px; margin: 0 auto;
          }
          .hide {
            display: none;
          }
        `}</style>
        <HighchartsReact
          highcharts={Highstocks}
          constructorType={'stockChart'}
          options={options}
        />
      </div>
    )
  }
  // componentDidMount() {

  //   const {OrdersStore} = this.props
  //   console.log('****&&&&&@@@@@@@@@@@@@@@@@')
  //   setTimeout(function(){
  //     var JSONdata = JSON.parse( JSON.stringify(OrdersStore.ohlcv) )
  //     console.log(JSONdata)
  //     Highstocks.stockChart('container', )
  //   }, 1000)

  // }
}
