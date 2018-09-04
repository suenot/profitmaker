// https://codesandbox.io/s/github/rrag/react-stockcharts-examples2/tree/master/examples/AreaChart
import React from 'react'
import Chart from './Chart'
import Preloader from '../../Preloader'
import { inject, observer } from 'mobx-react'

@inject('OrdersStore')
@observer
export default class ChartComponent extends React.Component {
	render() {
		const {OrdersStore} = this.props
		if (!OrdersStore.ordersChart || (JSON.stringify(OrdersStore.ordersChart) === '[]') ) {
			return <Preloader />
		} else {
			var ordersJSON = JSON.parse( JSON.stringify(OrdersStore.ordersChart) )
			return (
				<Chart type="hybrid" data={ordersJSON} />
			)
		}
	}
}
