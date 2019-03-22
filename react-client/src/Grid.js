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
import PerfectScrollbar from 'react-perfect-scrollbar'
const GridLayout = WidthProvider(RGL)

import SettingsStore from './stores/SettingsStore'
import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'


@observer
class Grid extends React.Component {
  fullscreenTransformOld = ''

  onLayoutChange(layout, dashboardActiveId) {
    DashboardsStore.setLayout(layout, dashboardActiveId)
  }

  render() {
    var drawer = (this.props.data && this.props.data.aside)
    var drawerName = drawer ? 'aside-right-second' : 'aside-left-first'
    var dashboardActiveId = (this.props.data && this.props.data.dashboardId) || DashboardsStore.dashboardActiveId
    if (dashboardActiveId === '') {
      return <div></div>
    }
    return (
      <div>
        <GridLayout
          margin={[-1, -1]}
          className="layout"
          cols={drawer ? 12 : 24}
          rowHeight={12}
          layout={DashboardsStore.widgets}
          onLayoutChange={(layout) => {
              try {
                this.onLayoutChange(layout, dashboardActiveId)
                setTimeout(function() {
                  window.dispatchEvent(new Event('resize'))
                }, 200)
              } catch(err) {}
            }
          }
          draggableCancel="input,textarea"
          draggableHandle=".draggable-header"
        >
          {
            _.map(DashboardsStore.dashboards[dashboardActiveId].widgets, (widget) => {
              const Component = require("./"+widget.component).default
              var customHeader = false
              if (widget.customHeader !== '') {
                customHeader = widget.customHeader
              }
              var dashboardId = dashboardActiveId
              var widgetId = widget.i
              var stock = widget.data.stock !== undefined ? widget.data.stock : ''
              var pair = widget.data.pair !== undefined ? widget.data.pair : ''
              var data = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data
              // var data = widget.data
              data = {
                dashboardId: dashboardId,
                widgetId: widgetId,
                drawer: drawerName,
                ...data
              }
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
                        <div className="pointer widget-icon settings-icon" onClick={this.drawerToggle.bind(
                            this,
                            drawerName,
                            widget.settings,
                            widget.settingsWidth,
                            data
                          )}>
                          <SettingsIcon style={{ fontSize: 18 }}/>
                        </div>
                        <div className="pointer widget-icon clear-icon" onClick={this.removeWidget.bind(this, widget.settings, data)}>
                          <ClearIcon style={{ fontSize: 18 }}/>
                        </div>
                      </div>
                    </div>
                    <div className="widget-body">
                      <PerfectScrollbar option={{'suppressScrollX': true}} className="widget-body">
                        {
                          React.createElement(Component, {'data': data})
                        }
                      </PerfectScrollbar>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </GridLayout>
      </div>
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
  drawerToggle(drawer, component, width, data, dashboardId, widgetId) {
    DrawersStore.drawerSet(drawer, component, width, data, dashboardId, widgetId)
    DrawersStore.drawerToggle(drawer)
  }
  removeWidget(settings, data) {
    DashboardsStore.removeWidget(settings, data)
  }
  componentDidMount() {
    try {
      document.title = DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].name
    } catch(err) { }
}
  componentDidUpdate() {
    try {
      document.title = DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].name
    } catch(err) { }
  }

}

export default Grid
