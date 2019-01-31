import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {url, key} = widget.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <Divider />
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
            <TextField
              id="outlined-name"
              label="Url"
              value={url}
              onChange={this.setWidgetData.bind(this, 'url', 'value')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
            <TextField
              id="outlined-name"
              label="Key"
              value={key}
              onChange={this.setWidgetData.bind(this, 'key', 'value')}
              variant="outlined"
              fullWidth
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
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value.trim())
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
