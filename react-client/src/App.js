/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Drawer from '@material-ui/core/Drawer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import MenuIcon from '@material-ui/icons/Menu'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'

import Grid from './Grid'
import 'element-theme-default'
import './App.sass'
import { observer } from 'mobx-react'
import SettingsIcon from '@material-ui/icons/Settings'
import AddIcon from '@material-ui/icons/Add'

import Alert from 'react-s-alert'
import 'react-s-alert/dist/s-alert-default.css'
import 'react-s-alert/dist/s-alert-css-effects/slide.css'
import 'react-s-alert/dist/s-alert-css-effects/scale.css'
import 'react-s-alert/dist/s-alert-css-effects/bouncyflip.css'
import 'react-s-alert/dist/s-alert-css-effects/flip.css'
import 'react-s-alert/dist/s-alert-css-effects/genie.css'
import 'react-s-alert/dist/s-alert-css-effects/jelly.css'
import 'react-s-alert/dist/s-alert-css-effects/stackslide.css'


import DashboardsStore from './stores/DashboardsStore'
import DrawersStore from './stores/DrawersStore'

const drawerWidth = 240
const styles = theme => ({
  root: {
    display: 'flex',
  },
  toolbar: {
    paddingRight: 24, // keep right padding when drawer closed
  },
  toolbarIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  menuButton: {
    marginLeft: 12,
    marginRight: 36,
  },
  menuButtonHidden: {
    display: 'none',
  },
  title: {
    flexGrow: 1,
  },
  drawerPaper: {
    position: 'relative',
    whiteSpace: 'nowrap',
    width: drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperClose: {
    overflowX: 'hidden',
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    width: theme.spacing.unit * 7,
    [theme.breakpoints.up('sm')]: {
      width: theme.spacing.unit * 9,
    },
  },
  drawerPaperRight: {
    // position: 'relative',
    // whiteSpace: 'nowrap',
    // width: drawerWidth,
    width: drawerWidth,
    // width: drawerRightWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  },
  drawerPaperRightClose: {
    width: 0
    // overflowX: 'hidden',
    // transition: theme.transitions.create('width', {
    //   easing: theme.transitions.easing.sharp,
    //   duration: theme.transitions.duration.leavingScreen,
    // }),
    // width: theme.spacing.unit * 7,
    // [theme.breakpoints.up('sm')]: {
    //   width: theme.spacing.unit * 9,
    // },
  },
  appBarSpacer: theme.mixins.toolbar,
  content: {
    flexGrow: 1,
    padding: theme.spacing.unit * 3,
    height: '100vh',
    overflow: 'auto',
  },
  chartContainer: {
    marginLeft: -22,
  },
  tableContainer: {
    height: 320,
  },
})


@observer
class App extends React.Component {
  state = {
    open: false,
  }

  // handleDrawerOpen = () => {
  //   this.setState({ open: true })
  // }

  // handleDrawerClose = () => {
  //   this.setState({ open: false })
  // }

  handleDrawerToggle = () => {
    this.setState({ open: !this.state.open })
  }

  render() {
    const { classes } = this.props
    const Component = require(DrawersStore.drawerRightComponent+"").default
    return (
      <React.Fragment>
        <style jsx="true">{`
          .${classes.drawerPaperRight} {
            width: ${DrawersStore.drawerRightWidth}
          }
          .${classes.drawerPaperRightClose} {
            width: 0
          }
        `}</style>
        <CssBaseline />
        <div className={classes.root}>
          <Alert stack={{limit: 3}} />
          <AppBar
            position="absolute"
            className={classNames(classes.appBar, this.state.open && classes.appBarShift)}
          >
            <Toolbar disableGutters={!this.state.open} className={classes.toolbar}>
              <IconButton
                color="inherit"
                aria-label="Open drawer"
                onClick={this.handleDrawerToggle}
                className={classNames(classes.menuButton, this.state.open && classes.hide)}
              >
                <MenuIcon />
              </IconButton>
              <img src={DashboardsStore.icon} alt="" width="24px" height="24px"></img> 
              <Typography variant="title" color="inherit" noWrap style={{flexGrow: 1}}>
                {/* {DashboardsStore.dashboardActiveId !== '0' && DashboardsStore.dashboards[DashboardsStore.dashboardActiveId].name.toUpperCase()} */}
                {DashboardsStore.dashboardActiveId !== '0' && DashboardsStore.name.toUpperCase()} : {DashboardsStore.stock} : {DashboardsStore.pair}
              </Typography>
              <IconButton
                color="inherit"
                aria-label="Settings"
                onClick={this.drawerRightToggle.bind(this, "./core_components/Settings/Settings.js", "300px")}
              >
                <SettingsIcon />
              </IconButton>
              <IconButton
                color="inherit"
                aria-label="Market"
                onClick={this.drawerRightToggle.bind(this, "./core_components/Market/Market.js", "432px")}
              >
                <AddIcon />
              </IconButton>
              {/* <IconButton
                color="inherit"
                aria-label="Settings"
                onClick={this.deleteDashboard.bind(this, DashboardsStore.dashboardActiveId)}
              >
                <DeleteIcon />
              </IconButton> */}
            </Toolbar>
          </AppBar>
          <Drawer
            variant="permanent"
            classes={{
              paper: classNames(classes.drawerPaper, !this.state.open && classes.drawerPaperClose),
            }}
            open={this.state.open}
          >
            <div className={classes.toolbarIcon}>
              <ListItem button>
                <ListItemText primary="New dashboard" onClick={this.addDashboard.bind(this)}/>
              </ListItem>

            </div>
            <Divider />
            {
              _.map(DashboardsStore.dashboards, (dashboard) => {
                return (
                  <ListItem button key={dashboard.id} onClick={this.setDashboard.bind(this, dashboard.id)}>
                    <ListItemIcon>
                      <img src={dashboard.icon} width="24px" height="24px" alt={dashboard.name}></img>
                    </ListItemIcon>
                    <ListItemText primary={dashboard.name} />
                  </ListItem>
                )
              })
            }
          </Drawer>
          <Drawer
            anchor="right"
            open={DrawersStore.drawerRightOpen}
            variant="permanent"
            classes={{
              paper: classNames(classes.drawerPaperRight, !DrawersStore.drawerRightOpen && classes.drawerPaperRightClose),
            }}
          >
            <div className="drawer-spacer">
              {
                React.createElement(Component, {'data': DrawersStore.drawerRightData})
              }
            </div>
          </Drawer>
          <main className={classes.content}>
            <div className={classes.appBarSpacer} />
            <Grid />
          </main>
        </div>
      </React.Fragment>
    )
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
  // deleteDashboard(id) {
  //   DashboardsStore.deleteDashboard(id)
  // }
}

App.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(App)
