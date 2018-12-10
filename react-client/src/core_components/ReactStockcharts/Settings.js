import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import Button from '@material-ui/core/Button'

import DashboardsStore from 'stores/DashboardsStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var stock = widget.data.stock
    var pair = widget.data.pair
    var timeframe = widget.data.timeframe
    var group = widget.data.group
    return (
      <div>
        <div className="section-body">
          <form noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget name</Typography>
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
              onChange={this.setWidgetData.bind(this, 'stock', 'value')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />

            <TextField
              id="outlined-name"
              label="Pair"
              value={pair}
              onChange={this.setWidgetData.bind(this, 'pair', 'value')}
              variant="outlined"
              fullWidth
            />

            <TextField
              id="outlined-name"
              label="Group"
              value={group}
              onChange={this.setGroup.bind(this, dashboardId, widgetId)}
              variant="outlined"
              fullWidth
              margin="normal"
            />
          </form>
        </div>
        <Divider />
        <div className="section-body">
          <Typography variant="h6" gutterBottom>Timeframes</Typography>
          <div className="react-stockcharts-timeframes">
            <Button variant={timeframe==='1m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>1m</Button>
            <Button variant={timeframe==='3m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>3m</Button>
            <Button variant={timeframe==='5m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>5m</Button>
            <Button variant={timeframe==='15m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>15m</Button>
            <Button variant={timeframe==='30m'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>30m</Button>
            <Button variant={timeframe==='1H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>1H</Button>
            <Button variant={timeframe==='2H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>2H</Button>
            <Button variant={timeframe==='4H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>4H</Button>
            <Button variant={timeframe==='6H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>6H</Button>
            <Button variant={timeframe==='12H'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>12H</Button>
            <Button variant={timeframe==='D'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>D</Button>
            <Button variant={timeframe==='W'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>W</Button>
            <Button variant={timeframe==='M'?'outlined':'text'} size="small" color="primary" onClick={this.setWidgetData.bind(this, 'timeframe', 'innerText')}>M</Button>
          </div>
        </div>
        <Divider />
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr].trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
  }
  setWidgetData(key, attr, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr].trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
}

export default Settings
