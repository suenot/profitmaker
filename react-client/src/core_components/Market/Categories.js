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
    var TemporaryDashboardId = (this.props.data && this.props.data.dashboardId)
    var dashboardId = TemporaryDashboardId || DashboardsStore.dashboardActiveId
    var aside = TemporaryDashboardId ? 'aside-right-second' : 'aside-left-first'
    return (
      <div className="market">
        <div className="categories">
          <div className="drawer-title">
            <div className="drawer-title-text">Widgets categories</div>
            <CloseIcon onClick={this.drawerClose.bind(this, aside)} className="pointer" />
          </div>
          <Divider />
          <List component="nav">
            {
              _.map(DashboardsStore.categories, (category) => {
                return (
                  <ListItem key={category} button onClick={this.selectCategory.bind(this, dashboardId, aside)}>
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
  selectCategory(dashboardId, aside, e) {
    DashboardsStore.selectCategory(e.target.textContent)
    DrawersStore.drawerSet(`${aside}`, "core_components/Market/Widgets.js", "320px", {dashboardId: dashboardId, aside: aside})
  }
  componentWillMount() {
    DashboardsStore.fetchWidgets()
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Market
