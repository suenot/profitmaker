import React from 'react'
import { observer } from 'mobx-react'
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles'
import MenuItem from '@material-ui/core/MenuItem'
import TextField from '@material-ui/core/TextField'
import OutlinedInput from '@material-ui/core/OutlinedInput'
import FormControl from '@material-ui/core/FormControl'
import InputLabel from '@material-ui/core/InputLabel'
import Select from '@material-ui/core/Select'
import Typography from '@material-ui/core/Typography'
import Button from '@material-ui/core/Button'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import _ from 'lodash'
import DashboardsStore from '../../stores/DashboardsStore'
import NotesStore from '../../stores/NotesStore'
import './Note.sass'


const styles = theme => ({
  container: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  // textField: {
  //   marginLeft: theme.spacing.unit,
  //   marginRight: theme.spacing.unit,
  // },
  formControl: {
    marginTop: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
    // minWidth: 120,
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
  state = {
    age: '',
    name: 'hai',
  };

  handleChange = event => {
    this.setState({ [event.target.name]: event.target.value });
  }
  changeCustomHeader(e) {
    // console.log(e)
    var {dashboardId, widgetId} = this.props.data
    _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader = e.target.value
  }
  setNote(id) {
    NotesStore.setNote(id)
  }
  render() {
    const { classes } = this.props
    var {dashboardId, widgetId} = this.props.data
    return (
      <div className="sections">
        {/* {dashboardId} - {widgetId} */}
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
            {/* <FormControl variant="outlined" className={classes.formControl}>
              <InputLabel
                ref={ref => {
                  this.labelRef = ReactDOM.findDOMNode(ref);
                }}
                htmlFor="outlined-age-simple"
              >
                Age
              </InputLabel>
              <Select
                value={this.state.age}
                onChange={this.handleChange}
                input={
                  <OutlinedInput
                    labelWidth={this.labelRef ? this.labelRef.offsetWidth : 0}
                    name="age"
                    id="outlined-age-simple"
                  />
                }
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value={10}>Ten</MenuItem>
                <MenuItem value={20}>Twenty</MenuItem>
                <MenuItem value={30}>Thirty</MenuItem>
              </Select>
            </FormControl> */}
          </form>
          <Divider />
          <Typography variant="h6" gutterBottom>Notes</Typography>
          <List component="nav">
            {
              _.map(NotesStore.notes, (note) => {
                return <ListItem button selected={note.id === NotesStore.noteActiveId} onClick={this.setNote.bind(this, note.id)}>
                  <ListItemText primary={note.name} />
                </ListItem>
              })
            }
          </List>
          <div className="buttons-group-2">
            <Button variant="contained" color="secondary" className={classes.button + ' button'}>
              Remove
            </Button>
            <Button variant="contained" color="primary" className={classes.button + ' button'} onClick={this.addNote.bind(this)}>
              New
            </Button>
          </div>
        </div>
      </div>
    )
  }
  addNote() {
    NotesStore.addNote()
  }
}

export default withStyles(styles)(Settings)
