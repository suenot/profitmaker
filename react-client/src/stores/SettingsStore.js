import { observable, action, reaction } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
// import uuidv1 from 'uuid/v1'

@version(3)
class SettingsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'settings' })
    trunk.init()
    reaction(
      () => this.keys,
      () => trunk.updateStore(this)
    )
    reaction(
      () => this.serverBackend,
      () => trunk.updateStore(this)
    )
    reaction(
      () => this.terminalBackend,
      () => trunk.updateStore(this)
    )
    reaction(
      () => this.fetchEnabled,
      () => trunk.updateStore(this)
    )
    reaction(
      () => this.defaultSetInterval,
      () => trunk.updateStore(this)
    )
    reaction(
      () => this.compactWidgetsHeader,
      () => trunk.updateStore(this)
    )
    // TODO добавить реакцию на изменение
    // reaction(
    //   () => this.widgets,
    //   () => trunk.updateStore(this)
    // )
  }
  @observable serverBackend = {
    name: 'Server backend',
    value: 'https://kupi.network/api'
  }
  @observable terminalBackend = {
    name: 'Terminal backend',
    value: 'http://localhost:8040'
  }
  @observable fetchEnabled = {
    name: 'Fetch',
    value: true
  }
  @observable defaultSetInterval = {
    name: 'Fetch interval',
    value: '2000'
  }
  @observable compactWidgetsHeader = false

  @action setServerBackend(value) {
    this.serverBackend.value = value
  }
  @action setTerminalBackend(value) {
    this.terminalBackend.value = value
  }
  @action setFetchEnabled() {
    this.fetchEnabled.value = !this.fetchEnabled.value
  }
  @action setDefaultSetInterval(value) {
    this.defaultSetInterval.value = value
  }
  @action setCompactWidgetsHeader() {
    this.compactWidgetsHeader = !this.compactWidgetsHeader
  }
}

const store = window.SettingsStore = new SettingsStore()
export default store

// export default SettingsStore
