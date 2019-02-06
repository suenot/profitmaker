/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import CloseIcon from '@material-ui/icons/Close'
import Divider from '@material-ui/core/Divider'
import PerfectScrollbar from 'react-perfect-scrollbar'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Market extends React.Component {
  render() {
    var drawer = this.props.data && (this.props.data.drawer)
    var TemporaryDashboardId = (this.props.data && (this.props.data.drawer === true) && DashboardsStore.drawerDashboardActiveId)
    var dashboardId = TemporaryDashboardId || DashboardsStore.dashboardActiveId
    var aside = (this.props.data && this.props.data.aside) || (TemporaryDashboardId ? 'aside-right-second' : 'aside-left-first')
    return (
      <div className="market">
        <div className="categories">
          <div className="drawer-title">
            <div className="drawer-title-text">Widgets categories</div>
            <CloseIcon onClick={this.drawerClose.bind(this, aside)} className="pointer" />
          </div>
          <Divider />
          <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
            <List component="nav">
              {
                _.map(DashboardsStore.categories, (category) => {
                  return (
                    <ListItem key={category} button onClick={this.selectCategory.bind(this, dashboardId, aside, drawer)}>
                      <ListItemText primary={category} />
                    </ListItem>
                  )
                })
              }
            </List>
          </PerfectScrollbar>
        </div>
      </div>
    )
  }
  selectCategory(dashboardId, aside, drawer, e) {
    DashboardsStore.selectCategory(e.target.textContent)
    DrawersStore.drawerSet(`${aside}`, "core_components/Market/Widgets.js", "320px", {dashboardId: dashboardId, aside: aside, drawer: drawer})
  }
  componentWillMount() {
    DashboardsStore.fetchWidgets()
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Market
