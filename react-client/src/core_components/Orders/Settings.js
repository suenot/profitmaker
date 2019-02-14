import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import CloseIcon from '@material-ui/icons/Close'
import PerfectScrollbar from 'react-perfect-scrollbar'
import OutlinedInput from '@material-ui/core/OutlinedInput'
import InputLabel from '@material-ui/core/InputLabel'
import MenuItem from '@material-ui/core/MenuItem'
import FormControl from '@material-ui/core/FormControl'
import Select from '@material-ui/core/Select'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var {stock, pair, type, visualMode, visualModeMax, visualModeCrocodileMax, visualModeWallsMax, group} = widget.data
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <Divider />
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
          <div className="section-body">
            <form noValidate autoComplete="off">
              <TextField
                id="outlined-name"
                label="Name"
                value={customHeader}
                onChange={this.changeCustomHeader.bind(this)}
                variant="outlined"
                fullWidth
                className="mb-16"
              />
              <TextField
                id="outlined-name"
                label="Stock"
                value={stock}
                onChange={this.setWidgetData.bind(this, 'stock', 'value', 'toUpperCase')}
                variant="outlined"
                fullWidth
                className="mb-16"
              />
              <TextField
                id="outlined-name"
                label="Pair"
                value={pair}
                onChange={this.setWidgetData.bind(this, 'pair', 'value', 'toUpperCase')}
                variant="outlined"
                fullWidth
                className="mb-16"
              />
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

              <FormControl variant="outlined" fullWidth>
                <InputLabel
                  ref={ref => {
                    this.InputLabelRef = ref;
                  }}
                  htmlFor="outlined-visualMode-simple"
                >
                  Visual mode
                </InputLabel>
                <Select
                  value={visualMode}
                  onChange={this.setWidgetData.bind(this, 'visualMode', 'value', undefined)}
                  fullWidth
                  className="mb-16"
                  input={
                    <OutlinedInput
                      labelWidth={90}
                      name="Visual mode"
                      id="outlined-visualMode-simple"
                    />
                  }
                >
                  <MenuItem value="none">none</MenuItem>
                  <MenuItem value="crocodile">crocodile</MenuItem>
                  <MenuItem value="walls">walls</MenuItem>
                </Select>
              </FormControl>

              <FormControl variant="outlined" fullWidth>
                <InputLabel
                  ref={ref => {
                    this.InputLabelRef = ref;
                  }}
                  htmlFor="outlined-visualModeMax-simple"
                >
                  Visual mode max
                </InputLabel>
                <Select
                  value={visualModeMax}
                  onChange={this.setWidgetData.bind(this, 'visualModeMax', 'value', undefined)}
                  fullWidth
                  className="mb-16"
                  input={
                    <OutlinedInput
                      labelWidth={125}
                      name="Visual mode max"
                      id="outlined-visualModeMax-simple"
                    />
                  }
                >
                  <MenuItem value="total sum">total sum</MenuItem>
                  <MenuItem value="fixed">fixed</MenuItem>
                </Select>
              </FormControl>

              {
                visualMode == 'crocodile' && visualModeMax == 'fixed' &&
                <TextField
                  id="outlined-name"
                  label="Max crocodile in usd"
                  value={visualModeCrocodileMax}
                  onChange={this.setWidgetData.bind(this, 'visualModeCrocodileMax', 'value', undefined)}
                  variant="outlined"
                  fullWidth
                  className="mb-16"
                />
              }

              {
                visualMode == 'walls' && visualModeMax == 'fixed' &&
                <TextField
                  id="outlined-name"
                  label="Max walls in usd"
                  value={visualModeWallsMax}
                  onChange={this.setWidgetData.bind(this, 'visualModeWallsMax', 'value', undefined)}
                  variant="outlined"
                  fullWidth
                  className="mb-16"
                />
              }

              <TextField
                id="outlined-name"
                label="Group"
                value={group}
                onChange={this.setGroup.bind(this, dashboardId, widgetId)}
                variant="outlined"
                fullWidth
              />
            </form>
          </div>
          <Divider />
        </PerfectScrollbar>
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
    DashboardsStore.setWidgetData(dashboardId, widgetId, key, value.trim(), fn)
  }
  setGroup(dashboardId, widgetId, e) {
    var value = e.target.value.trim()
    DashboardsStore.setWidgetData(dashboardId, widgetId, 'group', value)
    DashboardsStore.setGroup(dashboardId, widgetId, value)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
