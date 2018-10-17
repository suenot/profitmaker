import { observable, action } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'
import Alert from 'react-s-alert'

// @version(1)
class NotesStore {
  constructor() {
    // const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'notepad' })
    // trunk.init()
  }

  @observable notes = {
    '1': {
      id: '1',
      name: 'Demo note',
      text: 'One'
    },
    '2': {
      id: '2',
      name: 'Demo note',
      text: 'Two'
    }
  }
  // TODOOOOOOOO: active не катит, т.к. виджетов много на странице
  @observable noteActiveId = '1'
  @action setNote(id) {
    this.noteActiveId = id
  }
  notesCounter = 2
  @action addNote() {
    this.notesCounter += 1
    this.notes[this.notesCounter+""] = {
      id: this.notesCounter+"",
      name: 'Note',
      text: 'Sample text',
    }
    // this.notes[this.notesCounter+""] = {
    //   id: this.dashboardsCounter+"",
    //   name: 'Note',
    //   text: 'Sample text',
    // }
  }
  // @action removeDashboard(id) {
  //   if (Object.keys(this.notes).length > 1) {
  //     delete this.notes[id]
  //     this.noteActiveId = Object.keys(this.notes)[0]
  //   } else {
  //     Alert.warning('You must have at least one note', {
  //       position: 'bottom-right',
  //       effect: 'scale',
  //       beep: false,
  //       timeout: 'none'
  //     })
  //   }
  // }
}

const store = window.NotesStore = new NotesStore()
export default store

// export default NotesStore

