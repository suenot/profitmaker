// https://codesandbox.io/s/github/rrag/react-stockcharts-examples2/tree/master/examples/AreaChart

import React from 'react';
import { render } from 'react-dom';
import Chart from './Chart';
// import { getDataChart } from "./utils"

import Preloader from '../../Preloader'

import theme from './theme.scss'

import { inject, observer } from 'mobx-react'
// import { toJS } from 'mobx'


@inject('OrdersStore')
@observer
export default class ChartComponent extends React.Component {
	// state = {
	// 	data: false,
	// }



	// timeout = false
	// clearTimer = () => {
	// 	var that = this
	// 	clearTimeout(that.timeout)
	// }

	// componentWillUnmount () {
	// 	this.clearTimer()
	// }

	// componentDidMount() {
	// 	this.loadData()
	// }

	// async loadData() {
	// 	getDataChart(this.props.tokenAddress).then(data => {
	// 		this.setState({ data })
	// 	})
		

	// 	this.timeout = setTimeout(() => {
	// 		this.loadData()
	// 	}, 3000)
	// }

	render() {
		const {OrdersStore} = this.props
		if (!OrdersStore.ordersChart || (JSON.stringify(OrdersStore.ordersChart) == '[]') ) {
			// console.log('ПРЕЛОАДЕР')
			return <Preloader />
		} else {
			// console.log('ГРАФИК')
			// console.log(OrdersStore.ordersChart)
			// var ordersJSON = JSON.parse( JSON.stringify(OrdersStore.ordersChart) )
			var ordersJSON = JSON.parse( JSON.stringify(OrdersStore.ordersChart) )
			// console.log( ordersJSON )
			// if (orders != ordersJSON) { console.log('НЕ РАВНЫ') }
			return (
				<Chart type="hybrid" data={ordersJSON} />
			)
		}
	}
}