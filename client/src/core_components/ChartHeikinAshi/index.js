
import React from 'react';
import { render } from 'react-dom';
import Chart from './Chart';
import { getData } from "./utils"

import Preloader from '../Preloader'

// import { TypeChooser } from "react-stockcharts/lib/helper";

import theme from './theme.scss'

export default class ChartComponent extends React.Component {
	state = {
		data: false,
		// overlay: true,
	}

	componentDidMount() {
		const tokenAddress = this.props.tokenAddress
		getData(tokenAddress).then((response) => {
			this.setState({ data: response })
		})
	}


	// removeOverlay = () => {
	// 	this.setState({overlay: false})
	// }

	// renderOverlay() {
	// 	return (
	// 		<div className={theme.overlay} onClick={this.removeOverlay}>
	// 			Click for scaling...
	// 		</div>
	// 	)
	// }

	render() {
		const {data, overlay} = this.state

		// <TypeChooser>
		// 	{type => <Chart type={type} data={this.state.data} />}
		// </TypeChooser>
		//

		return (
			<div className={theme.wrapper}>
				<div className={theme.chart}>
					{!data && <Preloader />}
					{data && <Chart type="hybrid" data={data} />}
				</div>
			</div>
		)
	}
}
