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
    // console.log(stock, pair, timeframe)
    var key = `${stock}--${pair}--${timeframe}`
    // console.log(key)
		// if (!OhlcvStore.ohlcvComputed || (JSON.stringify(OhlcvStore.ohlcvComputed) === '[]') ) {
    // console.log(OhlcvStore.ohlcvComputed)
    // console.log(JSON.stringify(OhlcvStore.ohlcvComputed))
    // console.log(JSON.stringify(OhlcvStore.ohlcvComputed[key]))
    if (
      OhlcvStore.ohlcvComputed === undefined ||
      // JSON.stringify(OhlcvStore.ohlcvComputed) === 'undefined' ||
      JSON.stringify(OhlcvStore.ohlcvComputed) === '{}' ||
      // JSON.stringify(OhlcvStore.ohlcvComputed[key]) === 'undefined' ||
      OhlcvStore.ohlcvComputed[key] === undefined ||
      // OhlcvStore.ohlcvComputed[key] === [] ||
      // JSON.stringify(OhlcvStore.ohlcvComputed[key]) === '[]' ||
      JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) ).length < 3 ) {
      // {
      // console.log('IF')
			return <Preloader />
		} else {
      window.dispatchEvent(new Event('resize'))
      // console.log('ELSE')
      // console.log( JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) ).length )
      // console.log( OhlcvStore.ohlcvComputed[key] )
      var ordersJSON = JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) )
      // var ordersJSON = OhlcvStore.ohlcvComputed[key]
      // ОШИБКА В ТОМ, ЧТО ДАННЫЕ НЕ в OBJECT

			ordersJSON = ordersJSON.map(function(order){
				order.date = new Date(order.date)
				return order
      })

      console.log(ordersJSON)
      // console.log(this.props.data)
			return (
          <Chart id={`${dashboardId}_${widgetId}_chart`} type="hybrid" data={ordersJSON} _data={this.props.data} />
			)
		}
  }

  componentWillMount() {
    console.log('componentWillMount')
    // var {stock, pair, timeframe} = this.props.data
    // stock = stock !== '' ? stock : DashboardsStore.stock
    // pair = pair !== '' ? pair : DashboardsStore.pair
    // OhlcvStore.count(1, stock, pair, timeframe)
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
    this.componentDidUpdate()
  }

  componentWillUnmount() {
    console.log('componentWillUnmount')
    // var {stock, pair, timeframe} = this.props.data
    // stock = stock !== '' ? stock : DashboardsStore.stock
    // pair = pair !== '' ? pair : DashboardsStore.pair
    // OhlcvStore.count(-1, stock, pair, timeframe)
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }

  componentWillUpdate() {
    console.log('componentWillUpdate')
    // var stock = stock !== '' ? stock : this.stock
    // var pair = pair !== '' ? pair : this.pair
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
    // TODO: проверить console.log
  }
  componentDidUpdate() {
    console.log('componentDidUpdate')
    // var stock = stock !== '' ? stock : this.stock
    // var pair = pair !== '' ? pair : this.pair
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
    // TODO: проверить console.log
  }

}
