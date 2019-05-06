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
import QueueIcon from '@material-ui/icons/Queue'
import SettingsIcon from '@material-ui/icons/Settings'
import KeyIcon from '@material-ui/icons/VpnKey'
import ReactTooltip from 'react-tooltip'
import PerfectScrollbar from 'react-perfect-scrollbar'

import Grid from './Grid'
import 'element-theme-default'
import './App.sass'
import { observer } from 'mobx-react'

import Alert from 'react-s-alert'
import 'react-s-alert/dist/s-alert-default.css'
import 'react-s-alert/dist/s-alert-css-effects/jelly.css'

import 'rc-color-picker/assets/index.css'


// import listReactFiles from 'list-react-files'

import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'
import KeysStore from './stores/KeysStore'


@observer
class App extends React.Component {
  render() {
    var dashboardsLeft = _.filter(DashboardsStore.dashboards, (dashboard) => {
      return dashboard.side === 'left'
    })
    var dashboardsRight = _.filter(DashboardsStore.dashboards, (dashboard) => {
      return dashboard.side === 'right'
    })

    const AsideLeftFirstComponent = require('./'+DrawersStore.drawers['aside-left-first'].component+"").default
    const AsideLeftSecondComponent = require('./'+DrawersStore.drawers['aside-left-second'].component+"").default
    const AsideRightFirstComponent = require('./'+DrawersStore.drawers['aside-right-first'].component+"").default
    const AsideRightSecondComponent = require('./'+DrawersStore.drawers['aside-right-second'].component+"").default
    return (
      <React.Fragment>
        {/* <style jsx="true">{`
          .menu-left {
            width: ${DrawersStore.drawerRightWidth}
          }
        `}</style> */}
        <CssBaseline />
        <div>
          <Alert stack={{limit: 5}} timeout={5000} effect="jelly" position="bottom-right" beep={false} />
          <ReactTooltip place="right" effect="solid" />

          <Drawer
            variant="permanent"
            className="menu-left"
            classes={{
              paper: classNames('menu-left'),
            }}
          >
            <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: '100vh'}} className="flex-column">
              <ListItem button data-tip="New dashboard" onClick={this.addDashboard.bind(this, 'left')} className="list-item">
                <ListItemIcon className="item-icon">
                  <AddToQueueIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              {
                _.map(dashboardsLeft, (dashboard) => {
                  return (
                    <div key={dashboard.id}>
                      <ListItem
                        button
                        data-tip={dashboard.name}
                        onClick={this.setDashboard.bind(this, dashboard.id)}
                        className={"list-item " + (dashboard.id === DashboardsStore.dashboardActiveId ? "selected" : "")}
                      >
                        <ListItemIcon className="item-icon">
                          <img src={dashboard.icon} width="24px" height="24px" alt=""></img>
                        </ListItemIcon>
                      </ListItem>
                      <Divider />
                    </div>
                  )
                })
              }
              <div className="spacer"></div>
              <Divider />
              <ListItem
                button
                data-tip="API keys"
                onClick={this.drawerToggle.bind(this, "aside-left-first", "core_components/Keys/Keys.js", "320px", {drawer: "aside-left-first"})}
                className="list-item"
              >
                <ListItemIcon aria-label="API keys" className="item-icon">
                  <KeyIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              <ListItem
                button
                data-tip="Contact us"
                onClick={this.drawerToggle.bind(this, "aside-left-first", "core_components/Socials/Socials.js", "320px", {drawer: "aside-left-first"})}
                className="list-item"
                >
                <ListItemIcon aria-label="Contact us" className="item-icon">
                  <ChatIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              <ListItem
                button
                data-tip="Settings"
                onClick={this.drawerToggle.bind(this, "aside-left-first", "core_components/Settings/Settings.js", "320px", {dashboardId: DashboardsStore.dashboardActiveId})}
                className="list-item"
              >
                <ListItemIcon aria-label="Settings" className="item-icon">
                  <SettingsIcon />
                </ListItemIcon>
              </ListItem>
              <Divider className="divider"/>
              <ListItem button data-tip="Add widget" onClick={this.drawerToggle.bind(this, "aside-left-first", "core_components/Market/Categories.js", "320px", {dashboardId: DashboardsStore.dashboardActiveId})} className="add-widget-btn list-item">
                <ListItemIcon className="item-icon">
                  <QueueIcon />
                </ListItemIcon>
              </ListItem>
            </PerfectScrollbar>
          </Drawer>

          <Drawer
            anchor="right"
            variant="persistent"
            open={true}
            className="menu-right"
            classes={{
              paper: classNames('menu-right'),
            }}
          >
            <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: '100vh'}} className="flex-column">
              <ListItem button data-tip="New temporary dashboard" onClick={this.addDashboard.bind(this, 'right')} className="list-item">
                <ListItemIcon className="item-icon">
                  <AddToQueueIcon />
                </ListItemIcon>
              </ListItem>
              <Divider />
              {
                _.map(dashboardsRight, (dashboard) => {
                  return (
                    <div key={dashboard.id}>
                      <ListItem
                        button
                        data-tip={dashboard.name}
                        onClick={this.setDashboardDrawer.bind(this, "GridDrawer.js", "320px", {dashboardId: dashboard.id, drawer: true})}
                        className={"list-item " + (dashboard.id === DashboardsStore.drawerDashboardActiveId ? "selected" : "")}
                      >
                        <ListItemIcon className="item-icon">
                          <img src={dashboard.icon} width="24px" height="24px" alt=""></img>
                        </ListItemIcon>
                      </ListItem>
                      <Divider />
                    </div>
                  )
                })
              }
              <div className="spacer"></div>
              { DashboardsStore.drawerDashboardActiveId !== "" &&
                <div>
                  <Divider className="divider"/>
                  <ListItem
                      button
                      data-tip="Settings"
                      onClick={this.drawerToggle.bind(this, "aside-right-second", "core_components/Settings/Settings.js", "320px", {drawer: true})}
                      className="list-item"
                    >
                    <ListItemIcon aria-label="Settings" className="item-icon">
                      <SettingsIcon />
                    </ListItemIcon>
                  </ListItem>
                  <Divider className="divider"/>
                  <ListItem button data-tip="Add widget" onClick={this.drawerToggle.bind(this, "aside-right-second", "core_components/Market/Categories.js", "320px", {drawer: true})} className="add-widget-btn list-item">
                    <ListItemIcon className="item-icon">
                      <QueueIcon />
                    </ListItemIcon>
                  </ListItem>
                </div>
              }
            </PerfectScrollbar>
          </Drawer>

          <Drawer
            anchor="left"
            variant="persistent"
            open={DrawersStore.drawers['aside-left-first'].open}
            classes={{
              paper: classNames("drawer", "aside-left-first", (DrawersStore.drawers['aside-left-first'].open ? 'open' : 'close')),
            }}
          >
            {/* <div className="drawer-spacer"> */}
            {/* <PerfectScrollbar option={{'suppressScrollX': true}}> */}
              {
                React.createElement(AsideLeftFirstComponent, {'data': DrawersStore.drawers['aside-left-first'].data})
              }
            {/* </PerfectScrollbar> */}
            {/* </div> */}
          </Drawer>

          <Drawer
            anchor="left"
            variant="persistent"
            open={DrawersStore.drawers['aside-left-second'].open}
            classes={{
              paper: classNames("drawer", "aside-left-second", (DrawersStore.drawers['aside-left-second'].open ? 'open' : 'close')),
            }}
          >
            <div className="drawer-spacer">
              {
                React.createElement(AsideLeftSecondComponent, {'data': DrawersStore.drawers['aside-left-second'].data})
              }
            </div>
          </Drawer>

          <Drawer
            anchor="right"
            variant="persistent"
            open={DrawersStore.drawers['aside-right-first'].open}
            classes={{
              paper: classNames("drawer", "aside-right-first", (DrawersStore.drawers['aside-right-first'].open ? 'open' : 'close')),
            }}
          >
            <div className="drawer-spacer">
              {
                React.createElement(AsideRightFirstComponent, {'data': DrawersStore.drawers['aside-right-first'].data})
              }
            </div>
          </Drawer>

          <Drawer
            anchor="right"
            variant="persistent"
            open={DrawersStore.drawers['aside-right-second'].open}
            classes={{
              paper: classNames("drawer", "aside-right-second", (DrawersStore.drawers['aside-right-second'].open ? 'open' : 'close')),
            }}
          >
            <div className="drawer-spacer">
              {
                React.createElement(AsideRightSecondComponent, {'data': DrawersStore.drawers['aside-right-second'].data})
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

  setDashboardDrawer(component, width, data, e) {
    this.drawerToggle('aside-right-first', component, width, data, e)
    DashboardsStore.setDrawerDashboard(data.dashboardId)
  }
  drawerToggle(drawer, component, width, data, e) {
    e.preventDefault()
    if ( DrawersStore.drawers[drawer].component === component && JSON.stringify(DrawersStore.drawers[drawer].data) === JSON.stringify(data) ) {
      // current component
      if (drawer === 'aside-right-first') {
        setTimeout(()=>{
          DashboardsStore.setDrawerDashboard('')
        }, 50)
      }
      DrawersStore.drawerClose(drawer)
    } else {
      // new component
      if (DrawersStore.drawers[drawer].open === false) DrawersStore.drawerToggle(drawer)
      DrawersStore.drawerSet(drawer, component, width, data)
    }
  }
  setDashboard(id) {
    DashboardsStore.setDashboard(id)
  }
  addDashboard(side) {
    DashboardsStore.addDashboard(side)
  }
  componentWillMount() {
    KeysStore.fetchUserData()
  }
}

export default App
