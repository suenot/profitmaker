
import React from 'react';
import { render } from 'react-dom';
import Chart from './Chart';
// import { getData } from "./utils"

import Preloader from '../../Preloader'
import { inject, observer } from 'mobx-react'

// import { TypeChooser } from "react-stockcharts/lib/helper";

import theme from './theme.scss'

@inject('OrdersStore')
@observer
export default class ChartComponent extends React.Component {
	render() {
		const {OrdersStore} = this.props
		if (!OrdersStore.ohlcvComputed || (JSON.stringify(OrdersStore.ohlcvComputed) == '[]') ) {
			console.log('ПРЕЛОАДЕР')
			return <Preloader />
		} else {
			console.log('ГРАФИК')
			console.log(OrdersStore.ohlcvComputed)
			// var ordersJSON = JSON.parse( JSON.stringify(OrdersStore.ordersChart) )
			var ordersJSON = JSON.parse( JSON.stringify(OrdersStore.ohlcvComputed) )
			// var ordersJSON = OrdersStore.ohlcvComputed
			ordersJSON = ordersJSON.map(function(order){
				order.date = new Date(order.date)
				return order
			})
			console.log( ordersJSON )
			// if (orders != ordersJSON) { console.log('НЕ РАВНЫ') }
			return (
				<Chart type="hybrid" data={ordersJSON} />
			)
		}
	}
}
