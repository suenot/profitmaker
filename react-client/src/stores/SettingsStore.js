class SettingsStore {
  @observable serverBackend = {
    name: 'Server backend',
    value: 'http://api.kupi.network/'
  }
  @observable terminalBackend = {
    name: 'Server backend',
    value: 'http://localhost:8051/'
  }
  @observable fetchEnabled = {
    name: 'Fetch enabled',
    value: 'true'
  }
  @observable defaultSetInterval = {
    name: 'Fetch interval',
    value: '2000'
  }
}

// const store = window.SettingsStore = new SettingsStore()
// export default store

export default SettingsStore

