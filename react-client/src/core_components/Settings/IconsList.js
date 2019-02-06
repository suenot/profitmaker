import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'
import ArrowBackIcon from '@material-ui/icons/ArrowBackIos'
import Divider from '@material-ui/core/Divider'

import widgetsIcons from 'stores/data/widgetsIcons'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    var drawer = (this.props.data && (this.props.data.drawer === true))
    var dashboardId = (this.props.data && (this.props.data.drawer === true) && DashboardsStore.drawerDashboardActiveId) || DashboardsStore.dashboardActiveId
    var drawerName = (this.props.data && this.props.data.drawerName) || 'aside-left-first'
    return (
      <div className="drawer">
        <div className="drawer-title">
          <ArrowBackIcon onClick={this.backToSettings.bind(this, dashboardId, drawer, drawerName)} className="pointer" />
          <div className="drawer-title-text">Set icon</div>
          <CloseIcon onClick={this.drawerClose.bind(this, drawerName)} className="pointer" />
        </div>
        <Divider />
        <div className="simpleForm">
          <div className="icons-list">
            {
              _.map(widgetsIcons, (icon) => {
                return (
                  <IconButton key={icon} aria-label={icon} className="icon" onClick={this.setDashboardIcon.bind(this, icon, dashboardId)}>
                    <img src={`/img/widgets/${icon}`} alt={icon} />
                  </IconButton>
                )
              })
            }
          </div>
        </div>
      </div>
    )
  }
  backToSettings(dashboardId, drawer, drawerName) {
    DrawersStore.drawerSet(drawerName, "core_components/Settings/Settings.js", "320px", this.props.data)
  }
  setDashboardIcon(icon, dashboardId) {
    DashboardsStore.setDashboardIcon(`/img/widgets/${icon}`, dashboardId)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
