import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import InputAdornment from '@material-ui/core/InputAdornment'
import 'rc-color-picker/assets/index.css'
import ColorPicker from 'rc-color-picker'

import DashboardsStore from 'stores/DashboardsStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var group = widget.data.group
    var groupColor = widget.data.groupColor
    return (
      <div>
        <div className="section-body">
          <form noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget settings</Typography>
            <TextField
              id="outlined-name"
              label="Name"
              value={customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
            {/* // onChange={this.setWidgetData.bind(this, 'group', 'value')} */}
            <TextField
              id="outlined-name"
              label="Group"
              value={group}
              onChange={this.setGroup.bind(this, dashboardId, widgetId)}
              variant="outlined"
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment variant="filled" position="end">
                    <ColorPicker color={groupColor} mode="RGB" onChange={this.setGroupColor.bind(this, dashboardId, group)} placement="bottomRight" />
                  </InputAdornment>
                )
              }}
            />
          </form>
        </div>
        <Divider />
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setCustomHeader(dashboardId, widgetId, e.target.value)
  }
  setWidgetData(key, attr, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr]
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value)
  }
  setGroupColor(dashboardId, group, e) {
    var color = e.color
    DashboardsStore.setGroupColor(dashboardId, group, color)
    // DashboardsStore.setWidgetData(dashboardId, widgetId, key, value)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
}

export default Settings
