import React from 'react'
import { observer } from 'mobx-react'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Selector extends React.Component {
  render() {
    var {dashboardId, widgetId, stock, pair, group} = this.props.data
    return (
      <div className="selector">
        <Button size="medium" onClick={this.drawerRightToggle.bind(this, "core_components/Stocks/Stocks.js", "300px", {"group": group})}>
          <Typography variant="h6" color="inherit" noWrap>
            {stock}
          </Typography>
        </Button>
        <Button size="medium" onClick={this.drawerRightToggle.bind(this, "core_components/Pairs/Pairs.js", "300px", {"group": group, "stock": stock})}>
          <Typography variant="h6" color="inherit" noWrap>
            {pair}
          </Typography>
        </Button>
      </div>
    )
  }
  drawerRightToggle(component, width, data) {
    if (DrawersStore.drawerRightComponent === component) {
      // current component
      DrawersStore.drawerRightToggle()
    } else {
      // new component
      if (DrawersStore.drawerRightOpen === false) DrawersStore.drawerRightToggle()
      DrawersStore.drawerRightSet(component, width, data)
    }
    // DrawersStore.drawerRightSet(component, width)
    // DrawersStore.drawerRightToggle()
  }
}

export default Selector
