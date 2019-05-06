import React from 'react'
import { observer } from 'mobx-react'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'

import DrawersStore from 'stores/DrawersStore'

@observer
class Selector extends React.Component {
  render() {
    var {dashboardId, widgetId, stock, accountName, pair, group, drawer} = this.props.data
    return (
      <div className="selector">
        <Button size="medium"
          onClick={this.drawerToggle.bind(this, drawer, "core_components/Stocks/Stocks.js", "300px", {"group": group, "drawer": drawer})}>
          <Typography variant="h6" color="inherit" noWrap>
            {stock}
            <span className="selector-account">{accountName}</span>
          </Typography>
        </Button>
        <Button size="medium"
          onClick={this.drawerToggle.bind(this, drawer, "core_components/Pairs/Pairs.js", "300px", {"group": group, "stock": stock, "drawer": drawer})}>
          <Typography variant="h6" color="inherit" noWrap>
            {pair}
          </Typography>
        </Button>
      </div>
    )
  }
  drawerToggle(drawer, component, width, data) {
    if ( DrawersStore.drawers[drawer].component === component && JSON.stringify(DrawersStore.drawers[drawer].data) === JSON.stringify(data) ) {
      // current component
      DrawersStore.drawerToggle(drawer)
    } else {
      // new component
      if (DrawersStore.drawers[drawer].open === false) DrawersStore.drawerToggle(drawer)
      DrawersStore.drawerSet(drawer, component, width, data)
    }
    // DrawersStore.drawerRightSet(component, width)
    // DrawersStore.drawerRightToggle()
  }
}

export default Selector
