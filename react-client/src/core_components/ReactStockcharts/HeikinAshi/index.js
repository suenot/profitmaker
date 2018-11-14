import React from 'react'
import Chart from './Chart'
import Preloader from '../../Preloader'
import { observer } from 'mobx-react'
import './theme.sass'

import OhlcvStore from 'stores/OhlcvStore'

@observer
export default class ChartComponent extends React.Component {
	render() {
    var {dashboardId, widgetId, stock, pair, timeframe} = this.props.data
    var key = `${stock}--${pair}--${timeframe}`
    if (
      OhlcvStore.ohlcvComputed === undefined ||
      JSON.stringify(OhlcvStore.ohlcvComputed) === '{}' ||
      OhlcvStore.ohlcvComputed[key] === undefined ||
      JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) ).length < 3 ) {
			return <Preloader />
		} else {
      var ordersJSON = JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) )
			ordersJSON = ordersJSON.map(function(order){
				order.date = new Date(order.date)
				return order
      })

			return (
          <Chart id={`${dashboardId}_${widgetId}_chart`} type="hybrid" data={ordersJSON} _data={this.props.data} />
			)
		}
  }

  componentWillMount() {
    var {stock, pair, timeframe} = this.props.data
    OhlcvStore.count(1, stock, pair, timeframe)
  }
  componentWillUnmount() {
    var {stock, pair, timeframe} = this.props.data
    OhlcvStore.count(-1, stock, pair, timeframe)
  }
  componentWillUpdate() {
    var {stock, pair, timeframe} = this.props.data
    OhlcvStore.count(-1, stock, pair, timeframe)
  }
  componentDidUpdate() {
    var {stock, pair, timeframe} = this.props.data
    OhlcvStore.count(1, stock, pair, timeframe)
  }

}
