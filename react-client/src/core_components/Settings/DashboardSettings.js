import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import Button from '@material-ui/core/Button'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import IconButton from '@material-ui/core/IconButton'
import InputAdornment from '@material-ui/core/InputAdornment'
import ImageIcon from '@material-ui/icons/Image'
import CloseIcon from '@material-ui/icons/Close'
import RemoveFromQueueIcon from '@material-ui/icons/RemoveFromQueue'

import SettingsStore from 'stores/SettingsStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Dashboard settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <Divider />
        <div className="section-body">
          <form noValidate autoComplete="off">
            <TextField
              className="mb-16"
              label="Dashboard name"
              value={DashboardsStore.name}
              onChange={this.setDashboardName.bind(this)}
              variant="outlined"
              fullWidth
              margin="dense"
            />
            <TextField
              className="mb-16"
              label="Dashboard icon"
              value={DashboardsStore.icon}
              onChange={this.setDashboardIcon.bind(this)}
              variant="outlined"
              fullWidth
              margin="dense"
              InputProps={{
                endAdornment: (
                  <InputAdornment variant="filled" position="end">
                    <IconButton
                      aria-label="Icons list"
                      onClick={this.drawerRightSet.bind(this, "core_components/Settings/IconsList.js", "320px")}
                    >
                      <ImageIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <Button className="mb-16" fullWidth variant="contained" color="secondary" onClick={this.removeDashboard.bind(this, DashboardsStore.dashboardActiveId)}>
              <RemoveFromQueueIcon className="mr-8"/> Remove dashboard
            </Button>
          </form>
        </div>
        <Divider />
      </div>
    )
  }
  drawerRightSet(component, width) {
    DrawersStore.drawerRightSet(component, width)
    // DrawersStore.drawerRightToggle()
  }
  setServerBackend(event) {
    SettingsStore.setServerBackend(event.target.value)
  }
  setTerminalBackend(event) {
    SettingsStore.setTerminalBackend(event.target.value)
  }
  setFetchEnabled() {
    SettingsStore.setFetchEnabled()
  }
  setDefaultSetInterval(event) {
    SettingsStore.setDefaultSetInterval(event.target.value)
  }
  removeDashboard(id, event) {
    DashboardsStore.removeDashboard(id)
  }
  setDashboardName(event) {
    DashboardsStore.setDashboardName(event.target.value)
  }
  setDashboardIcon(event) {
    DashboardsStore.setDashboardIcon(event.target.value)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
