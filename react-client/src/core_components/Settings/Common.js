import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import _ from 'lodash'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {stock, pair, url, group} = widget.data
    return (
      <div className="section-body">
        <form noValidate autoComplete="off">
          { customHeader !== undefined &&
            <TextField
              id="outlined-name"
              label="Name"
              value={customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { stock !== undefined &&
            <TextField
              id="outlined-name"
              label="Stock"
              value={stock}
              onChange={this.setWidgetData.bind(this, 'stock', 'value', 'toUpperCase')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { pair !== undefined &&
            <TextField
              id="outlined-name"
              label="Pair"
              value={pair}
              onChange={this.setWidgetData.bind(this, 'pair', 'value', 'toUpperCase')}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { url !== undefined &&
            <TextField
              id="outlined-name"
              label="Url"
              value={url}
              onChange={this.setWidgetData.bind(this, 'url', 'value', undefined)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { group !== undefined &&
            <TextField
              id="outlined-name"
              label="Group"
              value={group}
              onChange={this.setGroup.bind(this, dashboardId, widgetId)}
              variant="outlined"
              fullWidth
            />
          }
          </form>
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target.value.trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
  }
  setWidgetData(key, attr, fn, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr].trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value, fn)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
