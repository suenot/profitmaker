import React from 'react'
import { observer } from 'mobx-react'
import { Input } from 'element-react'
// import GlobalStore from '../stores/GlobalStore'
import SettingsStore from '../stores/SettingsStore'

@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="simpleForm">
        <div className="simpleForm-formGroup">
          <div className="text">{SettingsStore.serverBackend.name}</div>
          <Input placeholder={SettingsStore.serverBackend.name} value={SettingsStore.serverBackend.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{SettingsStore.terminalBackend.name}</div>
          <Input placeholder={SettingsStore.terminalBackend.name} value={SettingsStore.terminalBackend.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{SettingsStore.fetchEnabled.name}</div>
          <Input placeholder={SettingsStore.fetchEnabled.name} value={SettingsStore.fetchEnabled.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{SettingsStore.defaultSetInterval.name}</div>
          <Input placeholder={SettingsStore.defaultSetInterval.name} value={SettingsStore.defaultSetInterval.value} />
        </div>
      </div>
    )
  }
}

export default Settings
