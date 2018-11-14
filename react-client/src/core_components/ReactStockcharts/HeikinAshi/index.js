import React from 'react'
import Chart from './Chart'
import Preloader from '../../Preloader'
import { observer } from 'mobx-react'
import './theme.sass'

import OhlcvStore from 'stores/OhlcvStore'
import DashboardsStore from 'stores/DashboardsStore'

@observer
export default class ChartComponent extends React.Component {
	render() {
    var {dashboardId, widgetId, stock, pair, timeframe} = this.props.data
    stock = stock !== '' ? stock : DashboardsStore.stock
    pair = pair !== '' ? pair : DashboardsStore.pair
    var key = `${stock}--${pair}--${timeframe}`
    if (
      OhlcvStore.ohlcvComputed === undefined ||
      JSON.stringify(OhlcvStore.ohlcvComputed) === '{}' ||
      OhlcvStore.ohlcvComputed[key] === undefined ||
      JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) ).length < 3 ) {
			return <Preloader />
		} else {
      window.dispatchEvent(new Event('resize')) // ???
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
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }
  componentWillUnmount() {
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }
  componentWillUpdate() {
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }
  componentDidUpdate() {
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }

}
