import React from 'react'
import _ from 'lodash'
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
import AddIcon from '@material-ui/icons/Add'
import RemoveIcon from '@material-ui/icons/Remove'
import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'

import SettingsStore from 'stores/SettingsStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">API keys</div>
          <div>
            <AddIcon onClick={this.addKey.bind(this)} className="pointer" />
            <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
          </div>
        </div>
        <Divider />
        {
          _.map(SettingsStore.keys, (key) => {
            return (
              <ExpansionPanel className="expansion-panel" key={key.id}>
                <ExpansionPanelSummary expandIcon={<ExpandMoreIcon className="expansion-panel-icon" />} className="expansion-panel-summary">
                  <Typography>{key.name}</Typography>
                </ExpansionPanelSummary>
                <ExpansionPanelDetails className="expansion-panel-details">
                  <form noValidate autoComplete="off">
                    <TextField
                      className="mb-16"
                      label="Unique name"
                      value={key.name}
                      onChange={this.setKeyData.bind(this, key.id, 'name')}
                      variant="outlined"
                      fullWidth
                      margin="dense"
                    />
                    <TextField
                      className="mb-16"
                      label="Stock"
                      value={key.stock}
                      onChange={this.setKeyData.bind(this, key.id, 'stock')}
                      variant="outlined"
                      fullWidth
                      margin="dense"
                    />
                    <TextField
                      className="mb-16"
                      label="Public key"
                      value={key.publicKey}
                      onChange={this.setKeyData.bind(this, key.id, 'publicKey')}
                      variant="outlined"
                      fullWidth
                      margin="dense"
                    />
                    <TextField
                      className="mb-16"
                      label="Private key"
                      value={key.privateKey}
                      onChange={this.setKeyData.bind(this, key.id, 'privateKey')}
                      variant="outlined"
                      fullWidth
                      margin="dense"
                    />
                    <TextField
                      className="mb-16"
                      label="Proxy"
                      value={key.proxy}
                      onChange={this.setKeyData.bind(this, key.id, 'proxy')}
                      variant="outlined"
                      fullWidth
                      margin="dense"
                    />
                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Switch
                            // checked={JSON.parse(key.enabled)}
                            onChange={this.toggleKeyData.bind(this, key.id, 'enabled')}
                            value={JSON.parse(key.enabled)}
                          />
                        }
                        label="On"
                      />
                    </FormGroup>
                    <Button className="mb-16" fullWidth variant="contained" color="secondary" onClick={this.removeKey.bind(this, key.id)}>
                      Remove key
                    </Button>
                  </form>
                </ExpansionPanelDetails>
              </ExpansionPanel>
            )
          })
        }
      </div>
    )
  }
  setKeyData(id, key, e) {
    SettingsStore.setKeyData(id, key, e.target.value)
  }
  toggleKeyData(id, key) {
    SettingsStore.toggleKeyData(id, key)
  }
  addKey() {
    SettingsStore.addKey()
  }
  removeKey(id) {
    SettingsStore.removeKey(id)
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Settings
