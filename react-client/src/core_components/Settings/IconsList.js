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
    return (
      <div className="drawer">
        <div className="drawer-title">
          <ArrowBackIcon onClick={this.backToSettings.bind(this)} className="pointer" />
          <div className="drawer-title-text">Set icon</div>
          <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
        </div>
        <Divider />
        <div className="simpleForm">
          <div className="icons-list">
            {
              _.map(widgetsIcons, (icon) => {
                return (
                  <IconButton key={icon} aria-label={icon} className="icon" onClick={this.setDashboardIcon.bind(this, icon)}>
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
  backToSettings() {
    DrawersStore.drawerRightSet("core_components/Settings/Settings.js", "300px")
  }
  setDashboardIcon(icon) {
    DashboardsStore.setDashboardIcon(`/img/widgets/${icon}`)
    // DrawersStore.drawerRightSet("core_components/Settings/Settings.js", "300px")
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Settings
