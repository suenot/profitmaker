import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import Button from '@material-ui/core/Button'
import CloseIcon from '@material-ui/icons/Close'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {stock, pair, url, timeframe, group} = widget.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
        </div>
        <div className="section-body">
          <form noValidate autoComplete="off">
            <TextField
              id="outlined-name"
              label="Name"
              value={customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />

            <TextField
              id="outlined-name"
              label="Stock"
              value={stock}
              onChange={this.setWidgetData.bind(this, 'stock', 'value', 'toUpperCase')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />

            <TextField
              id="outlined-name"
              label="Pair"
              value={pair}
              onChange={this.setWidgetData.bind(this, 'pair', 'value', 'toUpperCase')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />

            <TextField
              id="outlined-name"
              label="Url"
              value={url}
              onChange={this.setWidgetData.bind(this, 'url', 'value', undefined)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />

            <TextField
              id="outlined-name"
              label="Group"
              value={group}
              onChange={this.setGroup.bind(this, dashboardId, widgetId)}
              variant="outlined"
              fullWidth
            />
          </form>
        </div>
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
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target.value.trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
  }
  setWidgetData(key, attr, fn, e) {
    console.log(e)
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr].trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value, fn)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
  drawerRightClose() {
    DrawersStore.drawerClose('aside-left-first')
  }
}

export default Settings
