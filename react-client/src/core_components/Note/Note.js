import React from 'react'
import { observer } from 'mobx-react'
import './Note.sass'
import DashboardsStore from '../../stores/DashboardsStore'
import NotesStore from '../../stores/NotesStore'

@observer
class Notepad extends React.Component {
  render() {
    var {dashboardId, widgetId} = this.props.data
    return (
      <div>
        {/* {dashboardId} - {widgetId} */}
        {/* {NotesStore.noteActiveId} */}
        {/* {NotesStore.notes[NotesStore.noteActiveId].text} */}
        <textarea className="note-textarea" value={NotesStore.notes[NotesStore.noteActiveId].text}></textarea>
      </div>
    )
  }
}

export default Notepad
