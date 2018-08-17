
import React from 'react';
import { render } from 'react-dom';
import Chart from './Chart';
import { getData } from "./utils"

import Preloader from '../../Preloader'

// import { TypeChooser } from "react-stockcharts/lib/helper";

import theme from './theme.scss'

export default class ChartComponent extends React.Component {
	state = {
		data: 'loading',
		overlay: true,
	}

	componentDidMount() {
		const tokenAddress = this.props.tokenAddress
		getData(tokenAddress).then(data => {
			this.setState({ data })
		})
	}


	removeOverlay = () => {
		this.setState({overlay: false})
	}

	renderOverlay() {
		return (
			<div className={theme.overlay} onClick={this.removeOverlay}>
				Click for scaling...
			</div>
		)
	}

	render() {
		const {data, overlay} = this.state

		if (data == 'loading') {
			return <Preloader />
		}
		if (data == false) {
			return (
				<div>
					Data not found...
				</div>
			)
		}

		// <TypeChooser>
		// 	{type => <Chart type={type} data={this.state.data} />}
		// </TypeChooser>

		return (
			<div className={theme.wrapper}>
				{overlay ? this.renderOverlay() : ''}
				<div className={theme.chart}>
					<Chart type="hybrid" data={data} />
				</div>
			</div>
		)
	}
}
