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
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'

import SettingsStore from 'stores/SettingsStore'
import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">API keys</div>
          <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
        </div>
        <Divider />
        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>API key 1</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <Typography>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex,
              sit amet blandit leo lobortis eget.
            </Typography>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <ExpansionPanel>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>API key 2</Typography>
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <Typography>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse malesuada lacus ex,
              sit amet blandit leo lobortis eget.
            </Typography>
          </ExpansionPanelDetails>
        </ExpansionPanel>
        <div className="section-body">
          <form noValidate autoComplete="off">
            <TextField
              className="form-item"
              label="Name"
              value={DashboardsStore.name}
              onChange={this.setDashboardName.bind(this)}
              variant="outlined"
              fullWidth
              margin="dense"
            />
            <TextField
              className="form-item"
              label="Stock"
              value={DashboardsStore.name}
              onChange={this.setDashboardName.bind(this)}
              variant="outlined"
              fullWidth
              margin="dense"
            />
            <TextField
              className="form-item"
              label="Public key"
              value={DashboardsStore.name}
              onChange={this.setDashboardName.bind(this)}
              variant="outlined"
              fullWidth
              margin="dense"
            />
            <TextField
              className="form-item"
              label="Private key"
              value={DashboardsStore.name}
              onChange={this.setDashboardName.bind(this)}
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
                label="On/Off"
              />
            </FormGroup>
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
    console.log(event)
    DashboardsStore.removeDashboard(id)
  }
  setDashboardName(event) {
    DashboardsStore.setDashboardName(event.target.value)
  }
  setDashboardIcon(event) {
    DashboardsStore.setDashboardIcon(event.target.value)
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Settings
