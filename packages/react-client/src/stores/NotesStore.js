import { observable, action, reaction } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import Alert from 'react-s-alert'
import _ from 'lodash'

import DashboardsStore from 'stores/DashboardsStore'
// import DrawersStore from 'stores/DrawersStore'

@version(1)
class NotesStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'notes' })
    trunk.init()
    reaction(
      () => this.notes,
      () => trunk.updateStore(this)
    )
  }
  @observable notes = {
    '1': {
      id: '1',
      name: 'Note 1',
      text: 'Sample text 1'
    },
    '2': {
      id: '2',
      name: 'Note 2',
      text: 'Sample text 2'
    }
  }
  notesCounter = 2
  @action addNote() {
    this.notesCounter += 1
    this.notes[this.notesCounter+""] = {
      id: this.notesCounter+"",
      name: 'Note ' + this.notesCounter,
      text: 'Sample text ' + this.notesCounter,
    }
  }
  @action setName(noteId, value) {
    this.notes[noteId].name = value
  }
  @action getName(noteId) {
    return this.notes[noteId].name
  }
  @action setText(noteId, value) {
    this.notes[noteId].text = value
  }
  @action removeNote(id, noteId) {
    if (Object.keys(this.notes).length > 1) {
      if (noteId === id) {
        DashboardsStore.removeWidgetWithData('noteId', id)
      }
      delete this.notes[id]
    } else {
      Alert.warning('You must have at least one note')
    }
  }
  @action setNote(dashboardId, widgetId, id) {
    _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data.noteId = id
  }
  @action getNoteId(dashboardId, widgetId) {
    return _.find(DashboardsStore.dashboards[dashboardId].widgets, ['i', widgetId]).data.noteId
  }
}

const store = window.NotesStore = new NotesStore()
export default store

// export default NotesStore

