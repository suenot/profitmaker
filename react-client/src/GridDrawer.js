import React from "react"
import Divider from '@material-ui/core/Divider'
import CloseIcon from '@material-ui/icons/Close'
import Grid from './Grid'

class GridDrawer extends React.Component {
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
  drawerRightToggle(component, width, data, e) {
    e.preventDefault()
    if ( DrawersStore.drawerRightComponent === component && JSON.stringify(DrawersStore.drawerRightData) === JSON.stringify(data) ) {
      // current component
      DrawersStore.drawerRightToggle()
    } else {
      // new component
      if (DrawersStore.drawerRightOpen === false) DrawersStore.drawerRightToggle()
      DrawersStore.drawerRightSet(component, width, data)
    }
  }
  render() {
    // console.log(this.props.data.dashboardId)
    var dashboardId = this.props.data && this.props.data.dashboardId
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Temporary dashboard</div>
          <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
        </div>
        <Divider />
        <Grid data={this.props.data} />
        <Divider />
        <div className="spacer"></div>
        <div className="drawer-footer pointer" onClick={this.drawerRightToggle.bind(this, "core_components/Market/Categories.js", "320px", {dashboardId: dashboardId})}>
          Add widget
        </div>
        {/* <Divider /> */}
      </div>
    )
  }
}

export default GridDrawer
