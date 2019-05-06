import React from 'react'
import { observer } from 'mobx-react'
import TextField from '@material-ui/core/TextField'
import Divider from '@material-ui/core/Divider'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import _ from 'lodash'
import CloseIcon from '@material-ui/icons/Close'
import AddIcon from '@material-ui/icons/Add'
import './Note.sass'
import PerfectScrollbar from 'react-perfect-scrollbar'
import CommonSettings from 'core_components/Settings/Common.js'

import DashboardsStore from 'stores/DashboardsStore'
import NotesStore from 'stores/NotesStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Settings extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    var widget = _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId])
    var customHeader = widget.customHeader
    var noteId = NotesStore.getNoteId(dashboardId, widgetId)
    return (
      <div className="drawer">
        <div className="drawer-title">
          <div className="drawer-title-text">Widget settings</div>
          <CloseIcon onClick={this.drawerClose.bind(this, this.props.data.drawer)} className="pointer" />
        </div>
        <Divider />
        <PerfectScrollbar option={{'suppressScrollX': true}} style={{height: 'calc(100vh - 49px)'}}>
          <CommonSettings data={this.props.data}/>
          <Divider />
          <div className="drawer-subtitle">
            <div className="drawer-subtitle-text">Notes</div>
            <AddIcon onClick={this.addNote.bind(this)} className="pointer" />
          </div>
          <List component="nav" className="drawer-list">
            {
              _.map(NotesStore.notes, (note) => {
                return (
                  <ListItem button onClick={this.setNote.bind(this, note.id)} key={note.id} className={"drawer-list-item list-item " + (note.id === noteId ? "selected" : "")}>
                    <ListItemText primary={note.name} className="drawer-list-item-text" />
                    <CloseIcon onClick={this.removeNote.bind(this, note.id, noteId)} className="drawer-list-item-icon" />
                  </ListItem>
                )
              })
            }
          </List>
          <Divider />
        </PerfectScrollbar>
      </div>
    )
  }
  changeCustomHeader(e) {
    var {dashboardId, widgetId} = this.props.data
    var noteId = NotesStore.getNoteId(dashboardId, widgetId)
    var value = e.target.value.trim()
    DashboardsStore.setCustomHeader(dashboardId, widgetId, value)
    NotesStore.setName(noteId, value)
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
  removeNote(id, noteId, e) {
    e.preventDefault()
    e.stopPropagation()
    NotesStore.removeNote(id, noteId)
  }
  drawerClose(drawer) {
    DrawersStore.drawerClose(drawer)
  }
}

export default Settings
