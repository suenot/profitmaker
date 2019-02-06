import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import CloseIcon from '@material-ui/icons/Close'

import SettingsStore from 'stores/SettingsStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Global settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <Divider />
        <div className="section-body">
            <form noValidate autoComplete="off">
              <TextField
                className="mb-16"
                label={SettingsStore.serverBackend.name}
                value={SettingsStore.serverBackend.value}
                onChange={this.setServerBackend.bind(this)}
                variant="outlined"
                fullWidth
                margin="dense"
              />
              <TextField
                className="mb-16"
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
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={SettingsStore.compactWidgetsHeader}
                      onChange={this.setCompactWidgetsHeader.bind(this)}
                      value=""
                    />
                  }
                  label={SettingsStore.compactWidgetsHeader ? 'Headers on hover' : 'Static headers' }
                />
              </FormGroup>
            </form>
          </div>
        <Divider />
      </div>
    )
  }
  // drawerRightSet(component, width) {
  //   DrawersStore.drawerRightSet(component, width)
  //   // DrawersStore.drawerRightToggle()
  // }
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
  setCompactWidgetsHeader() {
    SettingsStore.setCompactWidgetsHeader()
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
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
