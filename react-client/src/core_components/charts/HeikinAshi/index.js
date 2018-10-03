import React from 'react'
import Chart from './Chart'
import Preloader from '../../Preloader'
import { observer } from 'mobx-react'
import OhlcvStore from '../../../stores/OhlcvStore'

@observer
export default class ChartComponent extends React.Component {
	render() {
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
  componentDidMount() {
    OhlcvStore.count(1)
  }
  componentWillUnmount() {
    OhlcvStore.count(-1)
  }
}
