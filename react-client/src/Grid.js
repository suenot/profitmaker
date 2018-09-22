/* eslint-disable import/first */
import _ from 'lodash'
import React from "react"
import { BrowserRouter as Router } from "react-router-dom"
// import { BrowserRouter as Router, Link, Route } from "react-router-dom"
import { WidthProvider, Responsive } from "react-grid-layout"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

// icons
import Clear from '@material-ui/icons/Clear'
import Settings from '@material-ui/icons/Settings'
import { inject, observer } from 'mobx-react'


const ResponsiveReactGridLayout = WidthProvider(Responsive);
const originalLayouts = getFromLS("layouts") || {};

@inject('DashboardsStore')
@observer
class Grid extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      layouts: JSON.parse(JSON.stringify(originalLayouts))
    }
  }

  static get defaultProps() {
    return {
      className: "layout",
      // cols: { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
      cols: { lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 },
      rowHeight: 23 // 30
    };
  }

  resetLayout() {
    this.setState({ layouts: {} });
  }

  onLayoutChange(layout, layouts) {
    saveToLS("layouts", layouts);
    this.setState({ layouts });
    // this.props.DashboardsStore.setLayout(layout)
  }

  render() {
    const {DashboardsStore} = this.props
    return (
      <Router>
        <ResponsiveReactGridLayout
          className="layout"
          cols={{ lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 }} // in 2 times more
          rowHeight={12}
          // layouts={DashboardsStore.widgets}
          layouts={this.state.layouts}
          onLayoutChange={(layout, layouts) => {
              this.onLayoutChange(layout)
              setTimeout(function() {
                window.dispatchEvent(new Event('resize'))
              }, 200)
            }
          }
          draggableCancel="input,textarea"
          draggableHandle=".widget-header"
        >
          {
            _.map(DashboardsStore.widgets, (widget) => {
              const Component = require(widget.component+"").default
              return (
                <div key={widget.i} data-grid={{ w: widget.w, h: widget.h, x: widget.x, y: widget.y, minW: widget.minW, minH:  widget.minH }}>
                  <div className="widget">
                    <div className="widget-header">
                      <span>{widget.header}</span>
                      <div>
                        <Settings style={{ fontSize: 18 }} />
                        <Clear style={{ fontSize: 18 }} />
                      </div>
                    </div>
                    <div className="widget-body">
                      {
                        React.createElement(Component, {'data': widget.data})
                      }
                    </div>
                  </div>
                </div>
              )
            })
          }
        </ResponsiveReactGridLayout>
      </Router>
    );
  }
  async componentWillMount() {

  }
}

// module.exports = ResponsiveLocalStorageLayout;

function getFromLS(key) {
  let ls = {};
  if (global.localStorage) {
    try {
      ls = JSON.parse(global.localStorage.getItem("rgl-8")) || {};
    } catch (e) {
      /*Ignore*/
    }
  }
  return ls[key];
}

function saveToLS(key, value) {
  if (global.localStorage) {
    global.localStorage.setItem(
      "rgl-8",
      JSON.stringify({
        [key]: value
      })
    );
  }
}

export default Grid
