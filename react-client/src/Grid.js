/* eslint-disable import/first */
import _ from 'lodash'
import React from "react"
import { BrowserRouter as Router } from "react-router-dom"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import Clear from '@material-ui/icons/Clear'
import { observer } from 'mobx-react'
import RGL, { WidthProvider } from 'react-grid-layout'
const GridLayout = WidthProvider(RGL)

import DashboardsStore from './stores/DashboardsStore'


@observer
class Grid extends React.Component {
  onLayoutChange(layout) {
    DashboardsStore.setLayout(layout)
  }

  render() {
    if (DashboardsStore.dashboardActiveId === '0') {
      return <div></div>
    }
    return (
      <Router>
        <GridLayout
          className="layout"
          cols={24}
          rowHeight={12}
          layout={DashboardsStore.widgets}
          onLayoutChange={(layout) => {
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
            JSON.stringify(DashboardsStore.dashboardActiveId) !== 'false' &&
            _.map(DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].widgets, (widget) => {
              const Component = require(widget.component+"").default
              return (
                <div key={widget.i} data-grid={{ w: widget.w, h: widget.h, x: widget.x, y: widget.y, minW: widget.minW, minH:  widget.minH }}>
                  <div className="widget">
                    <div className="widget-header">
                      <span>{widget.header}</span>
                      <div>
                        <Clear style={{ fontSize: 18 }} onClick={this.removeWidget.bind(this, widget.i)} className="pointer"/>
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
        </GridLayout>
      </Router>
    )
  }

  removeWidget(id) {
    DashboardsStore.removeWidget(id)
  }
}
export default Grid
