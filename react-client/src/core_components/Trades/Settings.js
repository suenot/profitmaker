import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {stock, pair, group} = widget.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
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
        </PerfectScrollbar>
      </div>

    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target.value.trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
  }
  setWidgetData(key, attr, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr]
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value.trim())
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
