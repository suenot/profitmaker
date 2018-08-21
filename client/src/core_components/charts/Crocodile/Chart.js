
import { scalePoint } from  "d3-scale";
import React from "react";
import PropTypes from "prop-types";

import { ChartCanvas, Chart } from "react-stockcharts";
import { BarSeries, AreaSeries } from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import { fitWidth, fitDimensions } from "react-stockcharts/lib/helper";

class BarChart extends React.Component {
	render() {
		const { data, type, height, width, ratio } = this.props;

		// const data = unsortedData.slice().sort((a, b) => a.income - b.income);
		return (
			<ChartCanvas ratio={ratio} width={width-5} height={height}
					margin={{ left: 40, right: 10, top: 20, bottom: 30 }} type={type}
					seriesName="Orders"
					xExtents={list => list.map(d => d.x)}
					data={data}
					xAccessor={d => d.x} xScale={scalePoint()}
					padding={0}>
				<Chart id={1} yExtents={d => [0, d.y]} fill="#ff0077">
					<XAxis axisAt="bottom" orient="bottom" />
					<YAxis axisAt="left" orient="left" ticks={6} />
					<AreaSeries yAccessor={d => d.y} fill="#ff0077" stroke="#ff0077" />
				</Chart>
				<Chart id={2} yExtents={d => [0, d.z]}>
					<AreaSeries yAccessor={d => d.z} fill="#00a849" stroke="#00a849" />
				</Chart>
			</ChartCanvas>

		);
	}
}


BarChart.propTypes = {
	data: PropTypes.array.isRequired,
	width: PropTypes.number.isRequired,
	ratio: PropTypes.number.isRequired,
	type: PropTypes.oneOf(["svg", "hybrid"]).isRequired,
};

BarChart.defaultProps = {
	type: "svg",
};

BarChart = fitDimensions(BarChart);

export default BarChart;
