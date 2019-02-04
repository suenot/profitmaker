import React from 'react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import Divider from '@material-ui/core/Divider'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'

import DrawersStore from 'stores/DrawersStore'

class Settings extends React.Component {
  openLink(link, type, event) {
    event.preventDefault()
    window.open(link, type)
  }
  render() {
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Contact us</div>
          <CloseIcon onClick={this.drawerClose.bind(this, 'aside-left-first')} className="pointer" />
        </div>
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
          <List component="nav">
            <ListItem button onClick={this.openLink.bind(this, 'https://discord.gg/2PtuMAg', '_blank')}>
              <ListItemIcon>
                <img src="/img/socials/discord.svg" alt="Discord" className="icon-size icon-grey"/>
              </ListItemIcon>
              <ListItemText primary="Discord" />
            </ListItem>
            <ListItem button onClick={this.openLink.bind(this, 'https://github.com/kupi-network/kupi-terminal', '_blank')}>
              <ListItemIcon>
                <img src="/img/socials/github.svg" alt="Github" className="icon-size icon-grey"/>
              </ListItemIcon>
              <ListItemText primary="Github" />
            </ListItem>
            <ListItem button onClick={this.openLink.bind(this, 'https://www.facebook.com/groups/kupi.network/', '_blank')}>
              <ListItemIcon>
                <img src="/img/socials/facebook.svg" alt="Facebook" className="icon-size icon-grey"/>
              </ListItemIcon>
              <ListItemText primary="Facebook" />
            </ListItem>
            <ListItem button onClick={this.openLink.bind(this, 'https://t.me/kupi_network', '_blank')}>
              <ListItemIcon>
                <img src="/img/socials/telegram.svg" alt="Telegram" className="icon-size icon-grey"/>
              </ListItemIcon>
              <ListItemText primary="Telegram" />
            </ListItem>
            <ListItem button onClick={this.openLink.bind(this, 'https://t.me/kupi_network_russian', '_blank')}>
              <ListItemIcon>
                <img src="/img/socials/telegram.svg" alt="Telegram (russian)" className="icon-size icon-grey"/>
              </ListItemIcon>
              <ListItemText primary="Telegram (russian)" />
            </ListItem>
          </List>
          <Divider />
        </PerfectScrollbar>
      </div>
    )
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
