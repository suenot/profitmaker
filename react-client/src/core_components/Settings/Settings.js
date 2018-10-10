import React from 'react'
import { observer } from 'mobx-react'
import { Input, Button } from 'element-react'
import SettingsStore from '../../stores/SettingsStore'
import DashboardsStore from '../../stores/DashboardsStore'

@observer
class Settings extends React.Component {
  render() {
    return (
      <div>

        <section className="simpleForm">
          <h4>Global settings</h4>
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
        </section>

        <section className="simpleForm">
          <h4>Dashboard settings</h4>
          <div className="simpleForm-formGroup">
            <div className="text">Dashboard name</div>
            <Input placeholder="Dashboard name" value={DashboardsStore.name} />
          </div>
          <div className="simpleForm-formGroup">
            <div className="text">Dashboard icon</div>
            <Input placeholder="Dashboard icon" value={DashboardsStore.icon} />
          </div>
          <Button type="danger" onClick={this.removeDashboard.bind(this, DashboardsStore.dashboardActiveId)}>Remove dashboard</Button>
        </section>

      </div>
    )
  }
  removeDashboard(id) {
    DashboardsStore.removeDashboard(id)
  }
}

export default Settings
