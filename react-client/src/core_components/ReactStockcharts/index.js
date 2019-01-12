import React from 'react'
import Chart from './Chart'
import Preloader from '../Preloader'
import { observer, toJS } from 'mobx-react'
import './theme.sass'
import template from 'es6-template-strings'

import OhlcvStore from 'stores/OhlcvStore'

@observer
export default class ChartComponent extends React.Component {
	render() {
    var {dashboardId, widgetId, stock, pair, timeframe, url} = this.props.data

		// TODO: combine in func
		try {
			var serverBackend = OhlcvStore.serverBackend
			var stockLowerCase = stock.toLowerCase()
			var resultUrl = template(url, { stock, stockLowerCase, pair, timeframe, serverBackend })
	    var key = `${stock}--${pair}--${timeframe}--${resultUrl}`
		}	catch(err) {}

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
    var {stock, pair, timeframe, url} = this.props.data
    OhlcvStore.count(1, stock, pair, timeframe, url)
  }
  componentWillUnmount() {
    var {stock, pair, timeframe, url} = this.props.data
    OhlcvStore.count(-1, stock, pair, timeframe, url)
  }
  componentWillUpdate() {
    var {stock, pair, timeframe, url} = this.props.data
    OhlcvStore.count(-1, stock, pair, timeframe, url)
  }
  componentDidUpdate() {
    var {stock, pair, timeframe, url} = this.props.data
    OhlcvStore.count(1, stock, pair, timeframe, url)
  }

}
