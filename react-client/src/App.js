import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { withStyles } from '@material-ui/core/styles'
import CssBaseline from '@material-ui/core/CssBaseline';
import Drawer from '@material-ui/core/Drawer'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import List from '@material-ui/core/List'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import MenuIcon from '@material-ui/icons/Menu'
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft'
import ChevronRightIcon from '@material-ui/icons/ChevronRight'
import { mailFolderListItems, otherMailFolderListItems } from './tileData'
import Grid from './Grid'
import 'element-theme-default'
import './App.sass'
import { inject, observer } from 'mobx-react'
import IconButton from '@material-ui/core/IconButton'
import {Settings, QueryBuilder} from '@material-ui/icons'

import Alert from 'react-s-alert'
import 'react-s-alert/dist/s-alert-default.css'
import 'react-s-alert/dist/s-alert-css-effects/slide.css'
import 'react-s-alert/dist/s-alert-css-effects/scale.css'
import 'react-s-alert/dist/s-alert-css-effects/bouncyflip.css'
import 'react-s-alert/dist/s-alert-css-effects/flip.css'
import 'react-s-alert/dist/s-alert-css-effects/genie.css'
import 'react-s-alert/dist/s-alert-css-effects/jelly.css'
import 'react-s-alert/dist/s-alert-css-effects/stackslide.css'

// components
import Orders from './core_components/Orders'
import Pairs from './core_components/Pairs'

const drawerWidth = 240


const styles = theme => ({
  root: {
    flexGrow: 1,
    zIndex: 1,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
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
  hide: {
    display: 'none',
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
    width: drawerWidth,
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
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '0 8px',
    ...theme.mixins.toolbar,
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing.unit * 3,
  },
})

@inject('GlobalStore')
@observer
class MiniDrawer extends React.Component {
  state = {
    open: false,
  }
  drawerRightToggle(GlobalStore, e) {
    // e.preventDefault()
    GlobalStore.drawerRightToggle()
  }
  handleClick1(GlobalStore, e) {
    console.log(e)
    this.props.GlobalStore.drawerRightSet(Pairs)
    // e.preventDefault()
    // Alert.warning('<h1>Test message 1</h1>', {
    //   position: 'top-right',
    //   effect: 'scale',
    //   onShow: function () {
    //     console.log('aye!')
    //   },
    //   beep: false,
    //   timeout: 'none',
    //   offset: 100
    // })
  }

  handleDrawerOpen = () => {
    this.setState({ open: true })
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'))
    }, 200)
  }

  handleDrawerClose = () => {
    this.setState({ open: false })
    setTimeout(function() {
      window.dispatchEvent(new Event('resize'))
    }, 200)
  }

  render() {
    const { classes, theme, GlobalStore } = this.props

    return (
      <React.Fragment>
      <CssBaseline />
      <div className={classes.root}>
        <Alert stack={{limit: 3}} />
        <AppBar
          position="absolute"
          className={classNames(classes.appBar, this.state.open && classes.appBarShift)}
        >
          <Toolbar disableGutters={!this.state.open}>
            <IconButton
              color="inherit"
              aria-label="Open drawer"
              onClick={this.handleDrawerOpen}
              className={classNames(classes.menuButton, this.state.open && classes.hide)}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="title" color="inherit" noWrap style={{flexGrow: 1}}>
              {GlobalStore.stock} : {GlobalStore.pair}

            </Typography>
            <IconButton
              color="inherit"
              aria-label="Settings"
              onClick={this.drawerRightToggle.bind(this, GlobalStore)}
            >
              <Settings />
            </IconButton>
            <IconButton
              color="inherit"
              aria-label="Settings"
              onClick={this.handleClick1.bind(this, GlobalStore)}
            >
              <QueryBuilder />
            </IconButton>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          classes={{
            paper: classNames(classes.drawerPaper, !this.state.open && classes.drawerPaperClose),
          }}
          open={this.state.open}
        >
          <div className={classes.toolbar}>
            <IconButton onClick={this.handleDrawerClose}>
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </div>
          <Divider />
          <List>{mailFolderListItems}</List>
          <Divider />
          <List>{otherMailFolderListItems}</List>
        </Drawer>
        <Drawer
          variant="permanent"
          anchor="right"
          open={GlobalStore.drawerRightOpen}
          variant="permanent"
          classes={{
            paper: classNames(classes.drawerPaperRight, !GlobalStore.drawerRightOpen && classes.drawerPaperRightClose),
          }}
        >
          <div>
            <br />
            <br />
            <br />
            {/* <Orders data={{type: "asks"}} /> */}
            {React.createElement(GlobalStore.drawerRightComponent, {'data': GlobalStore.drawerRightData})}
          </div>
        </Drawer>
        <main className={classes.content}>
          <div className={classes.toolbar} />
          <div className={classes.tableContainer}>
            <Grid />
          </div>
        </main>
      </div>
      </React.Fragment>
    )
  }
}

MiniDrawer.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
}

export default withStyles(styles, { withTheme: true })(MiniDrawer)
