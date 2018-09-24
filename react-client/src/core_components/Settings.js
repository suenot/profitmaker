import React from 'react'
import { inject, observer } from 'mobx-react'
import { Input } from 'element-react'

@inject('GlobalStore')
@observer
class Settings extends React.Component {
  render() {
    const {GlobalStore} = this.props
    return (
      // <div className="simpleForm">
      //   {
      //     _.map(GlobalStore.globalSettings, (item) => {
      //       return (
      //         <div className="simpleForm-formGroup">
      //           <div className="text">{item.name}</div>
      //           <Input placeholder={item.name} value={item.value} />
      //         </div>
      //       )
      //     })
      //   }
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
