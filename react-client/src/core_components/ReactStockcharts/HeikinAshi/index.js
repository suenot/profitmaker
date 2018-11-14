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
    var {stock, pair, timeframe} = this.props.data
    stock = stock !== '' ? stock : DashboardsStore.stock
    pair = pair !== '' ? pair : DashboardsStore.pair
    console.log(stock, pair, timeframe)
    var key = `${stock}--${pair}--${timeframe}`
    console.log(key)
		// if (!OhlcvStore.ohlcvComputed || (JSON.stringify(OhlcvStore.ohlcvComputed) === '[]') ) {
    console.log(OhlcvStore.ohlcvComputed)
    console.log(JSON.stringify(OhlcvStore.ohlcvComputed))
    if (
      JSON.stringify(OhlcvStore.ohlcvComputed) === 'undefined' ||
      JSON.stringify(OhlcvStore.ohlcvComputed) === '[]' ||
      JSON.stringify( OhlcvStore.ohlcvComputed[key]) === 'undefined' ||
      JSON.stringify(OhlcvStore.ohlcvComputed[key]) === '[]') {
      console.log('IF')
			return <Preloader />
		} else {
      console.log('ELSE')
      // console.log( OhlcvStore.ohlcvComputed[key] )
      var ordersJSON = JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed[key]) )
      // var ordersJSON = OhlcvStore.ohlcvComputed[key]
      // ОШИБКА В ТОМ, ЧТО ДАННЫЕ НЕ в OBJECT
      console.log(ordersJSON)
			ordersJSON = ordersJSON.map(function(order){
				order.date = new Date(order.date)
				return order
      })
      // console.log(this.props.data)
			return (
          <Chart type="hybrid" data={ordersJSON} _data={this.props.data} />
			)
		}
  }

  componentDidMount() {
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }

  componentWillUnmount() {
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
  }

  componentWillUpdate() {
    // var stock = stock !== '' ? stock : this.stock
    // var pair = pair !== '' ? pair : this.pair
    OhlcvStore.count(-1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
    // TODO: проверить console.log
  }
  componentDidUpdate() {
    // var stock = stock !== '' ? stock : this.stock
    // var pair = pair !== '' ? pair : this.pair
    OhlcvStore.count(1, this.props.data.stock, this.props.data.pair, this.props.data.timeframe)
    // TODO: проверить console.log
  }

}
