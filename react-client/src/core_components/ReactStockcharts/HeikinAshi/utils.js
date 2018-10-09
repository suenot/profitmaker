import { timeParse } from "d3-time-format";
import axios from 'axios';
const _ = require('lodash');



const parseDate = timeParse("%Y-%m-%d");


function jsonPrepare(arr) {

	let result = []
	_.values(arr).forEach(function(item, index) {
		result.push({
			absoluteChange: '',
			close: item.close,
			date: parseDate(item.date),
			dividend: '',
			high: item.high,
			low: item.low,
			open: item.open,
			percentChange: '',
			split: '',
			volume: item.volume,
		})
	})

	return result


}
export async function getData(tokenAddress) {

	let url = `https://api.ethplorer.io/getPriceHistoryGrouped/${tokenAddress}?apiKey=freekey`
	console.log(url)

	const data = await axios.get(url).then(function(response) {
		// console.log('----AXIOS----')
		// console.log(response.data.history.prices)
		let history = response.data.history.prices
		if(history) {
			return jsonPrepare(history)
		} else {
			return false
		}


	}).catch(function(error) {
		console.log(error);
	})

	return data

}
