import React from 'react'
import { observer } from 'mobx-react'
import { Input } from 'element-react'
import GlobalStore from '../stores/GlobalStore'

@observer
class Settings extends React.Component {
  render() {
    return (
      <div className="simpleForm">
        <div className="simpleForm-formGroup">
          <div className="text">{GlobalStore.serverBackend.name}</div>
          <Input placeholder={GlobalStore.serverBackend.name} value={GlobalStore.serverBackend.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{GlobalStore.terminalBackend.name}</div>
          <Input placeholder={GlobalStore.terminalBackend.name} value={GlobalStore.terminalBackend.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{GlobalStore.fetchEnabled.name}</div>
          <Input placeholder={GlobalStore.fetchEnabled.name} value={GlobalStore.fetchEnabled.value} />
        </div>
        <div className="simpleForm-formGroup">
          <div className="text">{GlobalStore.defaultSetInterval.name}</div>
          <Input placeholder={GlobalStore.defaultSetInterval.name} value={GlobalStore.defaultSetInterval.value} />
        </div>
      </div>
    )
  }
}

export default Settings
