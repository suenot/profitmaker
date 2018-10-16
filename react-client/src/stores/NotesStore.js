import { observable, action } from 'mobx'
// import { version, AsyncTrunk } from 'mobx-sync'

// @version(1)
class NotesStore {
  constructor() {
    // const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'notepad' })
    // trunk.init()
  }

  @observable notes = [
    {
      id: '1',
      name: 'Demo note',
      text: ''
    }
  ]
}

const store = window.NotesStore = new NotesStore()
export default store

// export default NotesStore

