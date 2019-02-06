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
import PerfectScrollbar from 'react-perfect-scrollbar'

import SettingsStore from 'stores/SettingsStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    var dashboardId = (this.props.data && (this.props.data.drawer === true) && DashboardsStore.drawerDashboardActiveId) || DashboardsStore.dashboardActiveId
    var dashboardData = DashboardsStore.dashboards[dashboardId]
    var {name, icon} = dashboardData
    var drawer = this.props.data && (this.props.data.drawer)
    var drawerName = this.props.data.drawer ? 'aside-right-second' : 'aside-left-first'
    var side = this.props.data.drawer ? 'right' : 'left'

    // var drawer = this.props.data && (this.props.data.drawer)
    // var TemporaryDashboardId = (this.props.data && (this.props.data.drawer === true) && DashboardsStore.drawerDashboardActiveId)
    // var dashboardId = TemporaryDashboardId || DashboardsStore.dashboardActiveId
    // var aside = (this.props.data && this.props.data.aside) || (TemporaryDashboardId ? 'aside-right-second' : 'aside-left-first')
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Dashboard settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, drawerName)} className="pointer" />
        </div>
        <Divider />
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
          <div className="section-body">
            <form noValidate autoComplete="off">
              <TextField
                className="mb-16"
                label="Dashboard name"
                value={name}
                onChange={this.setDashboardName.bind(this, dashboardId)}
                variant="outlined"
                fullWidth
                margin="dense"
              />
              <TextField
                className="mb-16"
                label="Dashboard icon"
                value={icon}
                onChange={this.setDashboardIcon.bind(this, dashboardId)}
                variant="outlined"
                fullWidth
                margin="dense"
                InputProps={{
                  endAdornment: (
                    <InputAdornment variant="filled" position="end">
                      <IconButton
                        aria-label="Icons list"
                        onClick={this.drawerSet.bind(this, drawerName, "core_components/Settings/IconsList.js", "320px", {dashboardId: dashboardId, drawerName: drawerName, drawer: drawer})}
                      >
                        <ImageIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <Button className="mb-16" fullWidth variant="contained" color="secondary" onClick={this.removeDashboard.bind(this, dashboardId, side)}>
                <RemoveFromQueueIcon className="mr-8"/> Remove dashboard
              </Button>
            </form>
          </div>
          <Divider />
          <div className="drawer-title">
            <div className="drawer-title-text">Global settings</div>
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
        </PerfectScrollbar>
      </div>
    )
  }
  drawerSet(drawer, component, width, data) {
    DrawersStore.drawerSet(drawer, component, width, data)
    // DrawersStore.drawerRightToggle()
  }
  setDashboardName(dashboardId, event) {
    DashboardsStore.setDashboardName(event.target.value, dashboardId)
  }
  setDashboardIcon(dashboardId, event) {
    DashboardsStore.setDashboardIcon(event.target.value, dashboardId)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
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
  setCompactWidgetsHeader() {
    SettingsStore.setCompactWidgetsHeader()
  }
  removeDashboard(dashboardId, side) {
    DashboardsStore.removeDashboard(dashboardId, side)
  }
}

export default Settings
