import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import CloseIcon from '@material-ui/icons/Close'
import IconButton from '@material-ui/core/IconButton'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var total = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data.total
    return (
      <div>
        <div className="section-body">
          <form noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget settings</Typography>
            <TextField
              id="outlined-name"
              label="Name"
              value={_.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
            <FormGroup>
              <FormControlLabel
              className="mb-16"
              control={
                  <Switch
                    checked={total}
                    onChange={this.setTotal.bind(this)}
                    value=""
                  />
                }
                label={total ? 'All stocks' : 'Current stock' }
              />
            </FormGroup>
            <TextField
              id="outlined-name"
              label="Stock"
              value={_.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data.stock}
              onChange={
                this.setStock.bind(this)
              }
              variant="outlined"
              fullWidth
              className={total ? 'hide' : ''}
            />
          </form>
        </div>
        <Divider />
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setCustomHeader(dashboardId, widgetId, e.target.value)
  }
  setTotal(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'total', e.target.checked)
    if (e.target.checked) {
      DashboardsStore.setWidgetData(dashboardId, widgetId, 'stock', 'TOTAL')
    } else {
      var stockTemp = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data.stockTemp
      DashboardsStore.setWidgetData(dashboardId, widgetId, 'stock', stockTemp)
    }
  }
  setStock(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'stock', e.target.value)
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'stockTemp', e.target.value)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Settings
