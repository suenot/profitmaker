import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'

import DashboardsStore from 'stores/DashboardsStore'

@observer
class Intuition extends React.Component {
  render() {
    var widget = {
      name: 'intuition_info',
      component: 'core_components/Intuition/Info.js',
      settings: 'core_components/Intuition/Settings.js',
      settingsWidth: '300px',
      img: 'core_components/Note/Note.png',
      header: 'Intuition info',
      customHeader: '',
      description: '',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Inutuition/Inutuition.js',
      data: {}
    }
    return (
      <div>
        <table className="simpleTable">
          <thead>
            <tr>
              <th className="simpleTable-header">Type</th>
              <th className="simpleTable-header">Pair</th>
              <th className="simpleTable-header">From</th>
              <th className="simpleTable-header">To</th>
              <th className="simpleTable-header">%</th>
              <th className="simpleTable-header">Total</th>
              <th className="simpleTable-header">Profit</th>
              <th className="simpleTable-header">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            <tr onClick={this.addWidget.bind(this, widget)}>
              <td>-</td>
              <td>ETH_BTC</td>
              <td>-</td>
              <td>-</td>
              <td>10%</td>
              <td>$10000</td>
              <td>$1000</td>
              <td>2 minutes</td>
            </tr>
            <tr onClick={this.addWidget.bind(this, widget)}>
              <td>-</td>
              <td>ETH_BTC</td>
              <td>-</td>
              <td>-</td>
              <td>10%</td>
              <td>$10000</td>
              <td>$1000</td>
              <td>2 minutes</td>
            </tr>
            <tr onClick={this.addWidget.bind(this, widget)}>
              <td>-</td>
              <td>ETH_BTC</td>
              <td>-</td>
              <td>-</td>
              <td>10%</td>
              <td>$10000</td>
              <td>$1000</td>
              <td>2 minutes</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }
  addWidget(widget) {
    DashboardsStore.addWidget(widget)
  }
}

export default Intuition
