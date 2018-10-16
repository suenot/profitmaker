import React from 'react'
import { observer } from 'mobx-react'
import './Note.sass'
@observer
class Notepad extends React.Component {
  render() {
    return (
      <textarea className="note-textarea"></textarea>
    )
  }
}

export default Notepad
