// https://codesandbox.io/s/github/rrag/react-stockcharts-examples2/tree/master/examples/AreaChart

import React from 'react';
import { render } from 'react-dom';
import Chart from './Chart';
import { getDataChart } from "./utils"

import Preloader from '../Preloader'

import theme from './theme.scss'

export default class ChartComponent extends React.Component {

	state = {
		data: false,
	}


	timeout = false
	clearTimer = () => {
		var that = this
		clearTimeout(that.timeout)
	}

	componentWillUnmount () {
		this.clearTimer()
	}

	componentDidMount() {
		this.loadData()
	}

	async loadData() {
		getDataChart(this.props.tokenAddress).then(data => {
			this.setState({ data })
		})

		this.timeout = setTimeout(() => {
            this.loadData()
        }, 3000)
	}

	render() {

		if (!this.state.data) {
			return <Preloader />
		} else {
			console.log(this.state.data)
		}


		return (
			<div className={theme.wrapper}>
                <Chart type="hybrid" data={this.state.data} />
            </div>
		)
	}
}
