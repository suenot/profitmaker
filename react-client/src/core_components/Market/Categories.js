/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import CloseIcon from '@material-ui/icons/Close'
import Divider from '@material-ui/core/Divider'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Market extends React.Component {
  render() {
    return (
      <div className="market">
        <div className="categories">
          <div className="drawer-title">
            <div className="drawer-title-text">Widgets categories</div>
            <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
          </div>
          <Divider />
          <List component="nav">
            {
              _.map(DashboardsStore.categories, (category) => {
                return (
                  <ListItem key={category} button onClick={this.selectCategory.bind(this)}>
                    <ListItemText primary={category} />
                  </ListItem>
                )
              })
            }
          </List>
        </div>
      </div>
    )
  }
  selectCategory(e) {
    DrawersStore.drawerRightSet("core_components/Market/Widgets.js", "320px")
  }
  componentWillMount() {
    DashboardsStore.fetchWidgets()
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Market
