import { observable, action, reaction } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'

@version(1)
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
    name: 'Fetch',
    value: true
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
  @action setFetchEnabled() {
    this.fetchEnabled.value = !this.fetchEnabled.value
  }
  @action setDefaultSetInterval(value) {
    this.defaultSetInterval.value = value
  }


  @observable keys = [
    // {
    //   name: 'My binance key 1',
    //   stock: 'binance',
    //   publicKey: '',
    //   privateKey: '',
    //   proxy: '',
    //   enabled: false
    // },
    // {
    //   name: 'My binance key 2',
    //   stock: 'binance',
    //   publicKey: '',
    //   privateKey: '',
    //   proxy: '',
    //   enabled: false
    // }
  ]
  @action setKeyData(id, key, value) {
    // var keyIndex = _.findIndex(this.keys, ['name', name])
    this.keys[id][key] = value
  }
  @action toggleKeyData(id, key) {
    // var keyIndex = _.findIndex(this.keys, ['name', name])
    this.keys[id][key] = !this.keys[id][key]
  }
  @observable counter = 0
  @action addKey() {
    this.keys.push({
      id: this.counter,
      name: 'Undefined key',
      stock: 'binance',
      publicKey: '',
      privateKey: '',
      proxy: '',
      enabled: false
    })
    this.counter += 1
  }
  @action removeKey(id) {
    this.keys = _.filter(this.keys, (key)=>{
      if (key.id !== id) return true
      return false
    })
  }
}

const store = window.SettingsStore = new SettingsStore()
export default store

// export default SettingsStore

