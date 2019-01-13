import React from 'react'
import Chart from './Chart'
import Preloader from '../Preloader'
import { observer } from 'mobx-react'
import './theme.sass'
import template from 'es6-template-strings'

import OhlcvStore from 'stores/OhlcvStore'

@observer
export default class ChartComponent extends React.Component {
	render() {
    var {dashboardId, widgetId} = this.props.data
    var key = this.getKey()
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
  getKey() {
    try {
      var {stock, pair, timeframe, url} = this.props.data
      var serverBackend = OhlcvStore.serverBackend
      var stockLowerCase = stock.toLowerCase()
      var resultUrl = template(url, { stock, stockLowerCase, pair, timeframe, serverBackend })
      var key = `${stock}--${pair}--${timeframe}--${resultUrl}`
      return key
    }	catch(err) { return undefined }
  }
  componentWillMount() {
    var key = this.getKey()
    OhlcvStore.count(1, key)
  }
  componentWillUnmount() {
    var key = this.getKey()
    OhlcvStore.count(-1, key)
  }
  componentWillUpdate() {
    var key = this.getKey()
    OhlcvStore.count(-1, key)
  }
  componentDidUpdate() {
    var key = this.getKey()
    OhlcvStore.count(1, key)
  }

}


