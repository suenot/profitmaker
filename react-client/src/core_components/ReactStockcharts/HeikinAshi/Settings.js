import React from 'react'
import { observer } from 'mobx-react'
import { withStyles } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
import Button from '@material-ui/core/Button'

import DashboardsStore from '../../../stores/DashboardsStore'


const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  typographyButton: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '0 4px 0 24px',
  },
  list: {
    padding: 0
  },
  formControl: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
    width: '100%'
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 4,
  },
  dense: {
    marginTop: 16,
  },
  menu: {
    width: 200,
  },
});

@observer
class Settings extends React.Component {
  render() {
    const { classes } = this.props
    var {dashboardId, widgetId} = this.props.data
    return (
      <div>
        <div className="section-body">
          <form className={classes.container} noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget name</Typography>
            <TextField
              id="outlined-name"
              label="Name"
              value={_.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
            />
          </form>
        </div>
        <Divider />
        <div className="section-body">
          <Typography variant="h6" gutterBottom>Timeframes</Typography>
          <div className="react-stockcharts-timeframes">
            <Button variant="outlined" size="small" color="primary">1m</Button>
            <Button variant="text" size="small" color="primary">3m</Button>
            <Button variant="text" size="small" color="primary">5m</Button>
            <Button variant="text" size="small" color="primary">15m</Button>
            <Button variant="text" size="small" color="primary">30m</Button>
            <Button variant="text" size="small" color="primary">1H</Button>
            <Button variant="text" size="small" color="primary">2H</Button>
            <Button variant="text" size="small" color="primary">4H</Button>
            <Button variant="text" size="small" color="primary">6H</Button>
            <Button variant="text" size="small" color="primary">12H</Button>
            <Button variant="text" size="small" color="primary">1D</Button>
            <Button variant="text" size="small" color="primary">1W</Button>
            <Button variant="text" size="small" color="primary">1M</Button>
          </div>
        </div>
        <Divider />
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setCustomHeader(dashboardId, widgetId, e.target.value)
  }
}

export default withStyles(styles)(Settings)
