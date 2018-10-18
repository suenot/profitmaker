import React from 'react'
import { observer } from 'mobx-react'
import { withStyles } from '@material-ui/core/styles'
import TextField from '@material-ui/core/TextField'
import Typography from '@material-ui/core/Typography'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemSecondaryAction from '@material-ui/core/ListItemSecondaryAction';
import ListItemText from '@material-ui/core/ListItemText'
import _ from 'lodash'
import IconButton from '@material-ui/core/IconButton'
import CloseIcon from '@material-ui/icons/Close'
import AddIcon from '@material-ui/icons/Add'
import DashboardsStore from '../../stores/DashboardsStore'
import NotesStore from '../../stores/NotesStore'
import './Note.sass'

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
})

@observer
class Settings extends React.Component {
  render() {
    const { classes } = this.props
    var {dashboardId, widgetId} = this.props.data
    var noteId = NotesStore.getNoteId(dashboardId, widgetId)
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
          <Typography variant="h6" className={classes.typographyButton}>
            <span>Notes</span>
            <IconButton className={classes.button} component="span" onClick={this.addNote.bind(this)}>
              <AddIcon />
            </IconButton>
          </Typography>
          <List component="nav" className={classes.list}>
            {
              _.map(NotesStore.notes, (note) => {
                return (
                  <ListItem button selected={note.id === noteId} onClick={this.setNote.bind(this, note.id)} key={note.id}>
                    <ListItemText primary={note.name} />
                    <ListItemSecondaryAction>
                      <IconButton aria-label="Delete" onClick={this.removeNote.bind(this, note.id)}>
                        <CloseIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                )
              })
            }
          </List>
        </div>
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var noteId = NotesStore.getNoteId(dashboardId, widgetId)
    DashboardsStore.setCustomHeader(dashboardId, widgetId, e.target.value)
    NotesStore.setName(noteId, e.target.value)
  }
  setNote(noteId) {
    var {dashboardId, widgetId} = this.props.data
    var noteName = NotesStore.getName(noteId)
    DashboardsStore.setCustomHeader(dashboardId, widgetId, noteName)
    NotesStore.setName(noteId, noteName)
    NotesStore.setNote(dashboardId, widgetId, noteId)
  }
  addNote() {
    NotesStore.addNote()
  }
  removeNote(id) {
    NotesStore.removeNote(id)
  }
}

export default withStyles(styles)(Settings)
