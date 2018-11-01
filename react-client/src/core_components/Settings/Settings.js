import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import Button from '@material-ui/core/Button'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import IconButton from '@material-ui/core/IconButton'
import InputAdornment from '@material-ui/core/InputAdornment'
import ImageIcon from '@material-ui/icons/Image'

import SettingsStore from '../../stores/SettingsStore'
import DashboardsStore from '../../stores/DashboardsStore'
import DrawersStore from '../../stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div>
        <div className="simpleForm">
          <div className="section">
            <form noValidate autoComplete="off">
              <Typography variant="h6" gutterBottom>Global settings</Typography>
              <TextField
                className="form-item"
                label={SettingsStore.serverBackend.name}
                value={SettingsStore.serverBackend.value}
                onChange={this.setServerBackend.bind(this)}
                variant="outlined"
                fullWidth
                margin="dense"
              />
              <TextField
                className="form-item"
                label={SettingsStore.terminalBackend.name}
                value={SettingsStore.terminalBackend.value}
                onChange={this.setTerminalBackend.bind(this)}
                variant="outlined"
                fullWidth
                margin="dense"
              />
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={SettingsStore.fetchEnabled.value}
                      onChange={this.setFetchEnabled.bind(this)}
                      value=""
                    />
                  }
                  label={SettingsStore.fetchEnabled.value ? SettingsStore.fetchEnabled.name + ' enabled' : SettingsStore.fetchEnabled.name + ' disabled' }
                />
              </FormGroup>
            </form>
          </div>
        </div>
        <Divider />
        <div className="simpleForm">
          <div className="section">
            <form noValidate autoComplete="off">
              <Typography variant="h6" gutterBottom>Dashboard settings</Typography>
              <TextField
                className="form-item"
                label="Dashboard name"
                value={DashboardsStore.name}
                onChange={this.setDashboardName.bind(this)}
                variant="outlined"
                fullWidth
                margin="dense"
              />
              <TextField
                className="form-item"
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
                        onClick={this.drawerRightSet.bind(this, "core_components/Settings/IconsList.js", "300px")}
                      >
                        <ImageIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button className="form-item" variant="contained" color="secondary" onClick={this.removeDashboard.bind(this, DashboardsStore.dashboardActiveId)}>
                Remove dashboard
              </Button>
            </form>
          </div>
        </div>
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
    console.log(event)
    DashboardsStore.removeDashboard(id)
  }
  setDashboardName(event) {
    DashboardsStore.setDashboardName(event.target.value)
  }
  setDashboardIcon(event) {
    DashboardsStore.setDashboardIcon(event.target.value)
  }
}

export default Settings
