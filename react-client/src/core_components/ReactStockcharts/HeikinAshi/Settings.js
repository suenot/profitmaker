import React from 'react'
import { observer } from 'mobx-react'
import { withStyles } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import _ from 'lodash'
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
      <div className="sections">
        <div className="section">
          <form className={classes.container + ' section-body'} noValidate autoComplete="off">
            <Typography variant="h6" gutterBottom>Widget settings</Typography>
            <TextField
              id="outlined-name"
              label="Name"
              value={_.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader}
              onChange={this.changeCustomHeader.bind(this)}
              variant="outlined"
              fullWidth
            />
          </form>
          <Divider />
        </div>
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    DashboardsStore.setCustomHeader(dashboardId, widgetId, e.target.value)
  }
}

export default withStyles(styles)(Settings)
