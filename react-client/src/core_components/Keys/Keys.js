import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import Button from '@material-ui/core/Button'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import InputAdornment from '@material-ui/core/InputAdornment'
import CloseIcon from '@material-ui/icons/Close'
import AddIcon from '@material-ui/icons/Add'
import ExpansionPanel from '@material-ui/core/ExpansionPanel'
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary'
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails'
import Typography from '@material-ui/core/Typography'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import PerfectScrollbar from 'react-perfect-scrollbar'
import ReactDOM from 'react-dom'
import axios from "axios"
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import KeyIcon from '@material-ui/icons/VpnKey'

import KeysStore from 'stores/KeysStore'
import DrawersStore from 'stores/DrawersStore'


@observer
class Keys extends React.Component {
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Accounts on local server</div>
          <div>
            <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
          </div>
        </div>
        <Divider />
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 135px)'}}>
          {/* {
            _.map(KeysStore.keys, (key) => {
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
                              checked={JSON.parse(key.enabled)}
                              onChange={this.toggleKeyData.bind(this, key.id, 'enabled')}
                              value={JSON.parse(key.enabled)}
                            />
                          }
                          label={JSON.parse(key.enabled) ? 'Enabled' : 'Disabled'}
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
          } */}

          <div className="section-body">
            { _.isEmpty(KeysStore.user) &&
              <form onSubmit={this.toLogin.bind(this)}>
                <TextField
                  id="email"
                  className="mb-16"
                  label="Email"
                  defaultValue=""
                  variant="outlined"
                  fullWidth
                  margin="dense"
                />
                <TextField
                  id="password"
                  className="mb-16"
                  label="Password"
                  defaultValue=""
                  variant="outlined"
                  fullWidth
                  margin="dense"
                  type="password"
                />
                <Button type="submit" className="mb-16" fullWidth variant="contained" color="primary" onClick={this.toLogin.bind(this)}>Login</Button>
              </form>
            }
          </div>

          { !_.isEmpty(KeysStore.user) &&
            _.map(KeysStore.accounts, (account) => {
              return (
                <ExpansionPanel className="expansion-panel" key={account.id}>
                  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon className="expansion-panel-icon" />} className="expansion-panel-summary">
                    <Typography>{account.name}</Typography>
                  </ExpansionPanelSummary>
                  <ExpansionPanelDetails className="expansion-panel-details">
                    <form noValidate autoComplete="off">
                      <TextField className="mb-16" label="Id" value={account.id} variant="outlined" fullWidth margin="dense" disabled={true} />
                      <TextField className="mb-16" label="Name" value={account.name} variant="outlined" fullWidth margin="dense" disabled={true} />
                      <TextField className="mb-16" label="Parser" value={account.parser} variant="outlined" fullWidth margin="dense" disabled={true} />
                      <TextField className="mb-16" label="Stock" value={account.stock} variant="outlined" fullWidth margin="dense" disabled={true} />
                      <TextField className="mb-16" label="Withdraw limit" value={account.withdrawLimit} variant="outlined" fullWidth margin="dense" disabled={true}
                        InputProps={{
                          endAdornment: <InputAdornment position="end">{account.withdrawLimitIn}</InputAdornment>,
                        }}
                      />
                      <TextField className="mb-16" label="Note" value={account.note} variant="outlined" fullWidth margin="dense" disabled={true} multiline />
                      <List dense={true}>
                        { account.safe &&
                          <ListItem>
                            <ListItemIcon>
                              <KeyIcon />
                            </ListItemIcon>
                            <ListItemText primary="Safe key" />
                          </ListItem>
                        }
                        { account.notSafe &&
                          <ListItem>
                            <ListItemIcon>
                              <KeyIcon />
                            </ListItemIcon>
                            <ListItemText primary="Not safe key" />
                          </ListItem>
                        }
                        { account.danger &&
                          <ListItem>
                            <ListItemIcon>
                              <KeyIcon />
                            </ListItemIcon>
                            <ListItemText primary="Danger key" />
                          </ListItem>
                        }
                      </List>
                    </form>
                  </ExpansionPanelDetails>
                </ExpansionPanel>
              )
            })
          }


        </PerfectScrollbar>

        <div className="spacer"></div>
        { !_.isEmpty(KeysStore.user) &&
          <div className="section-body">
            <Button className="mb-16" fullWidth variant="contained" color="secondary" onClick={this.toLogout.bind(this)}>Logout</Button>
          </div>
        }
        {/* <div className="drawer-footer alert">
          Keys in browser doesn't work now. They are only for demo. Use keys in your local server.
        </div> */}
      </div>
    )
  }
  toLogin(event) {
    event.preventDefault()
    var email = ReactDOM.findDOMNode(this).querySelector('#email').value
    var password = ReactDOM.findDOMNode(this).querySelector('#password').value
    KeysStore.toLogin(email, password)
  }
  toLogout() {
    KeysStore.toLogout()
  }
  setKeyData(id, key, e) {
    KeysStore.setKeyData(id, key, e.target.value)
  }
  toggleKeyData(id, key) {
    KeysStore.toggleKeyData(id, key)
  }
  addKey() {
    KeysStore.addKey()
  }
  removeKey(id) {
    KeysStore.removeKey(id)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Keys
