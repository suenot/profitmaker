import React from 'react'
import Chart from './Chart'
import Preloader from '../../Preloader'
import { inject, observer } from 'mobx-react'

@inject('OhlcvStore')
@observer
export default class ChartComponent extends React.Component {
	render() {
		const {OhlcvStore} = this.props
		if (!OhlcvStore.ohlcvComputed || (JSON.stringify(OhlcvStore.ohlcvComputed) === '[]') ) {
			return <Preloader />
		} else {
			var ordersJSON = JSON.parse( JSON.stringify(OhlcvStore.ohlcvComputed) )
			ordersJSON = ordersJSON.map(function(order){
				order.date = new Date(order.date)
				return order
			})
			return (
				<Chart type="hybrid" data={ordersJSON} />
			)
		}
	}
}
