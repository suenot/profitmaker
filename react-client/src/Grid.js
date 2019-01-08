/* eslint-disable import/first */
import _ from 'lodash'
import React from "react"
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import ClearIcon from '@material-ui/icons/Clear'
import SettingsIcon from '@material-ui/icons/Settings'
import FullscreenIcon from '@material-ui/icons/Fullscreen'
import FullscreenExitIcon from '@material-ui/icons/FullscreenExit'
import { observer } from 'mobx-react'
import RGL, { WidthProvider } from 'react-grid-layout'
const GridLayout = WidthProvider(RGL)

import SettingsStore from './stores/SettingsStore'
import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'


@observer
class Grid extends React.Component {

  fullscreenTransformOld = ''

  onLayoutChange(layout) {
    DashboardsStore.setLayout(layout)
  }

  render() {
    return (
      <GridLayout
        margin={[-1, -1]}
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
        draggableHandle=".draggable-header"
      >
        {
          JSON.stringify(DashboardsStore.dashboardActiveId) !== 'false' &&
          _.map(DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].widgets, (widget) => {
            const Component = require("./"+widget.component).default
            var customHeader = false
            if (widget.customHeader !== '') {
              customHeader = widget.customHeader
            }
            var dashboardId = DashboardsStore.dashboardActiveId
            var widgetId = widget.i
            var stock = widget.data.stock !== undefined ? widget.data.stock : ''
            var pair = widget.data.pair !== undefined ? widget.data.pair : ''
            var data = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data
            var compact = SettingsStore.compactWidgetsHeader ? 'compact' : ''
            return (
              <div key={widget.uid} data-grid={{ w: widget.w, h: widget.h, x: widget.x, y: widget.y, minW: widget.minW, minH:  widget.minH }}>
                <div className={`widget widget-${widget.name}`}>
                  <div className="widget-group-color" style={{background: widget.data.groupColor || 'transparent'}}></div>
                  <div className={'widget-header draggable-header grabbable ' + compact}>
                    <span>{ customHeader || widget.header} ({ stock || '' }{ pair ? `:${pair}` : '' })</span>
                    <div className="widget-icons">
                      <div className="pointer widget-icon fullscreen-exit-icon hide" onClick={this.fullscreen.bind(this)}>
                        <FullscreenExitIcon style={{ fontSize: 18 }}/>
                      </div>
                      <div className="pointer widget-icon fullscreen-icon" onClick={this.fullscreen.bind(this)}>
                        <FullscreenIcon style={{ fontSize: 18 }}/>
                      </div>
                      <div className="pointer widget-icon settings-icon" onClick={this.drawerRightToggle.bind(
                          this,
                          widget.settings,
                          widget.settingsWidth,
                          {
                            dashboardId: dashboardId,
                            widgetId: widgetId,
                            ...data
                          }
                        )}>
                        <SettingsIcon style={{ fontSize: 18 }}/>
                      </div>
                      <div className="pointer widget-icon clear-icon" onClick={this.removeWidget.bind(this, widget.i)}>
                        <ClearIcon style={{ fontSize: 18 }}/>
                      </div>
                    </div>
                  </div>
                  <div className="widget-body">
                    {
                      React.createElement(Component, {'data': {...widget.data, dashboardId: DashboardsStore.dashboardActiveId, widgetId: widget.i} })
                    }
                  </div>
                </div>
              </div>
            )
          })
        }
      </GridLayout>
      // HELPER FOR SCREENSHOTS
      // <div>
      //   {
      //     _.map(DashboardsStore.widgetsMarket, (widget) => {
      //       const Component = require("./"+widget.component).default
      //       return (
      //         <div className="widget" key={widget.id} style={{height: '402px', width: '642px', margin: '10px', overflow: 'hidden', float: 'left'}}>
      //           { React.createElement(Component, {data: widget.data}) }
      //         </div>
      //       )
      //     })
      //   }
      // </div>
    )
  }
  fullscreen(event) {
    event.preventDefault()
    var item = event.target.closest('.react-grid-item')
    if (item.classList.contains('fullscreen')) {
      item.style.setProperty('transform', this.fullscreenTransformOld)
    } else {
      this.fullscreenTransformOld = window.getComputedStyle(item).getPropertyValue('transform')
    }
    item.classList.toggle('fullscreen')
    item.querySelector('.widget-header').classList.toggle('draggable-header')
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'))
    }, 200)
    item.querySelector('.fullscreen-exit-icon').classList.toggle('hide')
    item.querySelector('.fullscreen-icon').classList.toggle('hide')
    item.querySelector('.settings-icon').classList.toggle('hide')
    item.querySelector('.clear-icon').classList.toggle('hide')
  }
  drawerRightToggle(component, width, data, dashboardId, widgetId) {
    DrawersStore.drawerRightSet(component, width, data, dashboardId, widgetId)
    DrawersStore.drawerRightToggle()
  }
  removeWidget(id) {
    DashboardsStore.removeWidget(id)
  }
  componentDidMount() {
    document.title = DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].name
  }
  componentDidUpdate() {
    document.title = DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].name
  }

}

export default Grid
