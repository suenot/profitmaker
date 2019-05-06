import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import FormGroup from '@material-ui/core/FormGroup'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import Switch from '@material-ui/core/Switch'
import InputAdornment from '@material-ui/core/InputAdornment'
import ColorPicker from 'rc-color-picker'
import OutlinedInput from '@material-ui/core/OutlinedInput'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

import _ from 'lodash'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId, drawer} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {stock, accountName, pair, type, url, group, groupColor, total, demo} = widget.data
    return (
      <div className="section-body">
        <form noValidate autoComplete="off">
          { customHeader !== undefined &&
            <TextField
              id="outlined-name"
              label="Name"
              value={customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { total !== undefined &&
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
          }

          { stock !== undefined && stock != 'TOTAL' &&
            <TextField
              id="outlined-name"
              label="Stock"
              value={stock}
              onClick={this.drawerToggle.bind(this, drawer, "core_components/Stocks/Stocks.js", "300px", {"group": group, "drawer": drawer})}
              variant="outlined"
              fullWidth
              className="mb-16"
              disabled
            />
          }

          { accountName !== undefined &&
            <TextField
              id="outlined-name"
              label="Account"
              value={accountName}
              onClick={this.drawerToggle.bind(this, drawer, "core_components/Stocks/Stocks.js", "300px", {"group": group, "drawer": drawer})}
              variant="outlined"
              fullWidth
              className="mb-16"
              disabled
            />
          }

          { pair !== undefined &&
            <TextField
              id="outlined-name"
              label="Pair"
              value={pair}
              onClick={this.drawerToggle.bind(this, drawer, "core_components/Pairs/Pairs.js", "300px", {"group": group, "stock": stock, "drawer": drawer})}
              variant="outlined"
              fullWidth
              className="mb-16"
              disabled
            />
          }

          { type !== undefined && widget.name === 'create-order' &&
            <TextField
              id="outlined-name"
              label="Type"
              value={type}
              onChange={this.setWidgetData.bind(this, 'type', 'value', undefined)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { type !== undefined && widget.name === 'orders' &&
            <FormControl variant="outlined" fullWidth>
              <InputLabel
                ref={ref => {
                  this.InputLabelRef = ref;
                }}
                htmlFor="outlined-type-simple"
              >
                Type
              </InputLabel>
              <Select
                value={type}
                onChange={this.setWidgetData.bind(this, 'type', 'value', undefined)}
                fullWidth
                className="mb-16"
                input={
                  <OutlinedInput
                    labelWidth={35}
                    name="Type"
                    id="outlined-type-simple"
                  />
                }
              >
                <MenuItem value="asks">asks</MenuItem>
                <MenuItem value="bids">bids</MenuItem>
                <MenuItem value="both">both</MenuItem>
              </Select>
            </FormControl>
          }


          { url !== undefined &&
            <TextField
              id="outlined-name"
              label="Url"
              value={url}
              onChange={this.setWidgetData.bind(this, 'url', 'value', undefined)}
              variant="outlined"
              fullWidth
              className="mb-16"
            />
          }

          { group !== undefined && groupColor !== undefined &&
              <TextField
              id="outlined-name"
              label="Group"
              value={group}
              onChange={this.setGroup.bind(this, dashboardId, widgetId)}
              variant="outlined"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment variant="filled" position="end">
                    <ColorPicker color={groupColor} mode="RGB" onChange={this.setGroupColor.bind(this, dashboardId, group)} placement="bottomRight" />
                  </InputAdornment>
                )
              }}
            />
          }

          { demo !== undefined &&
            <FormGroup>
              <FormControlLabel
              className="mb-16"
              control={
                  <Switch
                    checked={demo}
                    onChange={this.setWidgetData.bind(this, 'demo', 'checked', undefined)}
                    value=""
                  />
                }
                label={demo ? 'Demo on' : 'Demo off' }
              />
            </FormGroup>
          }

          </form>
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target.value.trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
  }
  setWidgetData(key, attr, fn, e) {
    var {dashboardId, widgetId} = this.props.data
    var value = e.target[attr]
    if (typeof(value) === 'string') value = value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value, fn)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
  setGroupColor(dashboardId, group, e) {
    var color = e.color
    DashboardsStore.setGroupColor(dashboardId, group, color)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
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

export default Settings
