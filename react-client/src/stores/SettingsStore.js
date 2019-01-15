import { observable, action, reaction } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import uuidv1 from 'uuid/v1'

@version(2)
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
    value: 'http://api.kupi.network'
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
  @observable compactWidgetsHeader = true

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


  @observable keys = []
  @action setKeyData(id, key, value) {
    var index = _.findIndex(this.keys, ['id', id])
    this.keys[index][key] = value || ''
  }
  @action toggleKeyData(id, key) {
    var index = _.findIndex(this.keys, ['id', id])
    this.keys[index][key] = !this.keys[index][key]
  }
  // @observable counter = 0
  @action addKey() {
    this.keys.push({
      id: uuidv1(),
      name: 'Undefined key',
      stock: 'binance',
      publicKey: '',
      privateKey: '',
      proxy: '',
      enabled: false
    })
    // this.counter += 1
  }
  @action removeKey(id) {
    console.log(JSON.stringify(this.keys))
    this.keys = _.filter(this.keys, (key)=>{
      if (key.id !== id) return true
      return false
    })
    console.log(JSON.stringify(this.keys))

  }
}

const store = window.SettingsStore = new SettingsStore()
export default store

// export default SettingsStore
