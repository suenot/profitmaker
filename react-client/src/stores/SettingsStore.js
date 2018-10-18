import { observable, action } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'

@version(1)
class SettingsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'settings' })
    trunk.init()
    // TODO добавить реакцию на изменение
    // reaction(
    //   () => this.widgets,
    //   () => trunk.updateStore(this)
    // )
  }
  @observable serverBackend = {
    name: 'Server backend',
    value: 'http://api.kupi.network'
  }
  @observable terminalBackend = {
    name: 'Terminal backend',
    value: 'http://localhost:8051'
  }
  @observable fetchEnabled = {
    name: 'Fetch enabled',
    value: 'true'
  }
  @observable defaultSetInterval = {
    name: 'Fetch interval',
    value: '2000'
  }

  @action setServerBackend(value) {
    this.serverBackend.value = value
  }
  @action setTerminalBackend(value) {
    this.terminalBackend.value = value
  }
  @action setFetchEnabled(value) {
    this.fetchEnabled.value = value
  }
  @action setDefaultSetInterval(value) {
    this.defaultSetInterval.value = value
  }
}

const store = window.SettingsStore = new SettingsStore()
export default store

// export default SettingsStore

