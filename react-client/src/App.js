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
          <Fab className="fab" onClick={this.drawerRightToggle.bind(this, "core_components/Market/Market.js", "320px")}>
            <AddIcon />
          </Fab>
          <Alert stack={{limit: 5}} />
          <ReactTooltip place="right" effect="solid" />
          <Drawer
            variant="permanent"
            className="drawer-left"
            classes={{
              paper: classNames('drawer-left'),
            }}
          >
            <ListItem button data-tip="New dashboard">
              <ListItemIcon onClick={this.addDashboard.bind(this)}>
                <AddToQueueIcon />
              </ListItemIcon>
            </ListItem>
            <Divider />
            {
              _.map(DashboardsStore.dashboards, (dashboard) => {
                return (
                  <div key={dashboard.id}>
                    <ListItem data-tip={dashboard.name} button selected={dashboard.id === DashboardsStore.dashboardActiveId} onClick={this.setDashboard.bind(this, dashboard.id)}>
                      <ListItemIcon>
                        <img src={dashboard.icon} width="24px" height="24px" alt={dashboard.name}></img>
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
              <ListItem button data-tip="Contact us">
                <ListItemIcon
                  aria-label="Contact us"
                  onClick={this.drawerRightToggle.bind(this, "core_components/Socials/Socials.js", "320px")}
                >
                  <ChatIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              <ListItem button data-tip="Settings">
                <ListItemIcon
                  aria-label="Settings"
                  onClick={this.drawerRightToggle.bind(this, "core_components/Settings/Settings.js", "320px")}
                >
                  <SettingsIcon />
                </ListItemIcon>
              </ListItem>
            </div>
          </Drawer>
          <Drawer
            anchor="right"
            variant="persistent"
            // ModalProps={{ onBackdropClick: this.drawerRightClose, onEscapeKeyDown: this.drawerRightClose, BackdropProps: {invisible: true} }}
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
  drawerRightToggle(component, width) {
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
