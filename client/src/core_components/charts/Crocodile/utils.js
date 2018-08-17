// import {web3ordersBook} from '../../../utils/getWeb3.js'
// import { inject, observer } from 'mobx-react'

// @inject('Orderbooks')
// @observer
// import Orderbooks from '../../../stores/Orderbooks'
import _ from 'lodash'
// import { toJS } from 'mobx'

export async function getDataChart(tokenAddress) {
	// const {Orderbooks} = this.props
	// let getOrders = await web3ordersBook(tokenAddress).then((res) => {
	// 	return res
	// })
	// let getOrders = toJS(Orderbooks)
	let getOrders =	[{price: 1, total: 2, type: 'sell'}, {price: 2, total: 3, type: 'buy'}]

	let asks = []
	let bids = []

	getOrders.map((item, index) => {

		if(item.type == 'sell') {
			asks.push({
				x: item.price,
				y: item.total,
				z: 0,
			})
		} else {
			bids.push({
				x: item.price,
				y: 0,
				z: item.total,
			})
		}


	})
	asks = _.orderBy(asks, ['total'], ['asc']);
	bids = _.orderBy(bids, ['total'], ['desc']);

	let together = []
	asks.map((item, index) => { together.push(item) })
	bids.map((item, index) => { together.push(item) })

	console.log('----')
	console.log(together)

	return together

}
