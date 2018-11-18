import React from 'react'
import { observer } from 'mobx-react'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Selector extends React.Component {
  render() {
    return (
      <div className="selector">
        <Button size="medium" onClick={this.drawerRightToggle.bind(this, "core_components/Stocks/Stocks.js", "300px")}>
          <Typography variant="h6" color="inherit" noWrap>
            {DashboardsStore.stock}
          </Typography>
        </Button>
        <Button size="medium" onClick={this.drawerRightToggle.bind(this, "core_components/Pairs/Pairs.js", "300px")}>
          <Typography variant="h6" color="inherit" noWrap>
            {DashboardsStore.pair}
          </Typography>
        </Button>
      </div>
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
    // DrawersStore.drawerRightSet(component, width)
    // DrawersStore.drawerRightToggle()
  }
}

export default Selector
