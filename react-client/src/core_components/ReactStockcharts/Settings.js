import React from 'react'
import { observer } from 'mobx-react'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import Button from '@material-ui/core/Button'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'
import CommonSettings from 'core_components/Settings/Common.js'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var {timeframe} = widget.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
          <CommonSettings data={this.props.data}/>
          <Divider />
          <div className="drawer-title">
            <div className="drawer-title-text">Timeframes</div>
          </div>
          <div className="section-body">
            <div className="react-stockcharts-timeframes">
              <Button variant={timeframe==='1m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>1m</Button>
              <Button variant={timeframe==='3m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>3m</Button>
              <Button variant={timeframe==='5m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>5m</Button>
              <Button variant={timeframe==='15m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>15m</Button>
              <Button variant={timeframe==='30m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>30m</Button>
              <Button variant={timeframe==='1H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>1H</Button>
              <Button variant={timeframe==='2H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>2H</Button>
              <Button variant={timeframe==='4H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>4H</Button>
              <Button variant={timeframe==='6H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>6H</Button>
              <Button variant={timeframe==='12H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>12H</Button>
              <Button variant={timeframe==='D'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>D</Button>
              <Button variant={timeframe==='W'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>W</Button>
              <Button variant={timeframe==='M'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText', undefined)}>M</Button>
            </div>
          </div>
          <Divider />
        </PerfectScrollbar>
      </div>
    )
  }
  setWidgetData(key, attr, fn, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr].trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value, fn)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
