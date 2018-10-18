import React from 'react'
import { observer } from 'mobx-react'
import NotesStore from '../../stores/NotesStore'
import './Note.sass'

@observer
class Notepad extends React.Component {
  render() {
    var {noteId} = this.props.data
    try {
      return (
        <div>
          <textarea className="note-textarea" value={NotesStore.notes[noteId].text} onChange={this.changeText.bind(this)}></textarea>
        </div>
      )
    } catch(err) {
      return <div></div>
    }
  }
  changeText(e) {
    var {noteId} = this.props.data
    NotesStore.setText(noteId, e.target.value)
  }
}

export default Notepad
