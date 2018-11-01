import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import Typography from '@material-ui/core/Typography'
import IconButton from '@material-ui/core/IconButton'

import widgetsIcons from '../../stores/data/widgetsIcons'
import DashboardsStore from '../../stores/DashboardsStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div>
        <div className="simpleForm">
          <Typography variant="h6" gutterBottom>Set icon</Typography>
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
  setDashboardIcon(icon) {
    DashboardsStore.setDashboardIcon(`/img/widgets/${icon}`)
    // DrawersStore.drawerRightSet("core_components/Settings/Settings.js", "300px")
  }
}

export default Settings
