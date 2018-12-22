/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import classNames from 'classnames'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import Divider from '@material-ui/core/Divider'
import ChatIcon from '@material-ui/icons/Chat'
import AddToQueueIcon from '@material-ui/icons/AddToQueue'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import AddIcon from '@material-ui/icons/Add'
import KeyIcon from '@material-ui/icons/VpnKey'
import Fab from '@material-ui/core/Fab'
import ReactTooltip from 'react-tooltip'

import Grid from './Grid'
import 'element-theme-default'
import './App.sass'
import { observer } from 'mobx-react'
import SettingsIcon from '@material-ui/icons/Settings'

import Alert from 'react-s-alert'
import 'react-s-alert/dist/s-alert-default.css'
import 'react-s-alert/dist/s-alert-css-effects/slide.css'
import 'react-s-alert/dist/s-alert-css-effects/scale.css'
import 'react-s-alert/dist/s-alert-css-effects/bouncyflip.css'
import 'react-s-alert/dist/s-alert-css-effects/flip.css'
import 'react-s-alert/dist/s-alert-css-effects/genie.css'
import 'react-s-alert/dist/s-alert-css-effects/jelly.css'
import 'react-s-alert/dist/s-alert-css-effects/stackslide.css'

// import listReactFiles from 'list-react-files'

import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'


@observer
class App extends React.Component {
  render() {
    const Component = require('./'+DrawersStore.drawerRightComponent+"").default
    return (
      <React.Fragment>
        <style jsx="true">{`
          .drawer-right {
            width: ${DrawersStore.drawerRightWidth}
          }
        `}</style>
        <CssBaseline />
        <div>
          <Alert stack={{limit: 5}} />
          <ReactTooltip place="right" effect="solid" />
          <Drawer
            variant="permanent"
            className="drawer-left"
            classes={{
              paper: classNames('drawer-left'),
            }}
          >
            <ListItem button data-tip="New dashboard" onClick={this.addDashboard.bind(this)}>
              <ListItemIcon>
                <AddToQueueIcon />
              </ListItemIcon>
            </ListItem>
            <Divider />
            {
              _.map(DashboardsStore.dashboards, (dashboard) => {
                return (
                  <div key={dashboard.id}>
                    <ListItem
                      button
                      data-tip={dashboard.name}
                      onClick={this.setDashboard.bind(this, dashboard.id)}
                      className={"list-item " + (dashboard.id === DashboardsStore.dashboardActiveId ? "selected" : "")}
                    >
                      <ListItemIcon>
                        <img src={dashboard.icon} width="24px" height="24px" alt=""></img>
                      </ListItemIcon>
                    </ListItem>
                    <Divider />
                  </div>
                )
              })
            }
            <div className="spacer"></div>
            <div>
            <Divider />
              <ListItem
                button
                data-tip="API keys"
                onClick={this.drawerRightToggle.bind(this, "core_components/Keys/Keys.js", "320px")}
              >
                <ListItemIcon aria-label="API keys">
                  <KeyIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              <ListItem
                button
                data-tip="Contact us"
                onClick={this.drawerRightToggle.bind(this, "core_components/Socials/Socials.js", "320px")}
                >
                <ListItemIcon aria-label="Contact us">
                  <ChatIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              <ListItem
                button
                data-tip="Settings"
                onClick={this.drawerRightToggle.bind(this, "core_components/Settings/GlobalSettings.js", "320px")}
              >
                <ListItemIcon aria-label="Settings">
                  <SettingsIcon />
                </ListItemIcon>
              </ListItem>
            </div>
          </Drawer>
          <Drawer
            anchor="right"
            variant="persistent"
            open="true"
            className="drawer-dashboard"
            classes={{
              paper: classNames('drawer-dashboard'),
            }}
          >
            <ListItem button data-tip="Add widget" onClick={this.drawerRightToggle.bind(this, "core_components/Market/Categories.js", "320px")} className="add-widget-btn">
              <ListItemIcon>
                <AddIcon />
              </ListItemIcon>
            </ListItem>
            <Divider className="divider"/>
            <div className="spacer"></div>
            <Divider className="divider"/>
            <ListItem button data-tip="Dashboard settings" onClick={this.drawerRightToggle.bind(this, "core_components/Settings/DashboardSettings.js", "320px")}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
            </ListItem>
            <Divider className="divider"/>
          </Drawer>
          <Drawer
            anchor="right"
            variant="persistent"
            open={DrawersStore.drawerRightOpen}
            className="drawer-right"
            classes={{
              paper: classNames('drawer-right'),
            }}
          >
            <div className="drawer-spacer">
              {
                React.createElement(Component, {'data': DrawersStore.drawerRightData})
              }
            </div>
          </Drawer>

          <main className="main">
            <Grid />
          </main>
        </div>
      </React.Fragment>
    )
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
  drawerRightToggle(component, width, e) {
    e.preventDefault()
    if (DrawersStore.drawerRightComponent === component) {
      // current component
      DrawersStore.drawerRightToggle()
    } else {
      // new component
      if (DrawersStore.drawerRightOpen === false) DrawersStore.drawerRightToggle()
      DrawersStore.drawerRightSet(component, width)
    }
  }
  setDashboard(id) {
    DashboardsStore.setDashboard(id)
  }
  addDashboard() {
    DashboardsStore.addDashboard()
  }
}

export default App
