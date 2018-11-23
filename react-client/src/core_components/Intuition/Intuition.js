import React from 'react'
import { observer } from 'mobx-react'
import _ from 'lodash'
import moment from 'moment'

import DashboardsStore from 'stores/DashboardsStore'
import Store from './Store'

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
              <th className="simpleTable-header">Action</th>
              <th className="simpleTable-header">Pair</th>
              <th className="simpleTable-header">From</th>
              <th className="simpleTable-header">To</th>
              <th className="simpleTable-header">%</th>
              <th className="simpleTable-header">Profit</th>
              <th className="simpleTable-header">Total</th>
              <th className="simpleTable-header">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {
              _.map(Store.signals, (signal) => {
                return (
                  <tr key={signal.id} onClick={this.addWidget.bind(this, widget)}>
                    <td>{signal.action}</td>
                    <td>{signal.pair}</td>
                    <td>{signal.stockFrom}</td>
                    <td>{signal.stockTo}</td>
                    <td>{signal.percent ? signal.percent.toFixed(2) : 0}%</td>
                    <td>{signal.profit ? signal.profit.toFixed(2) : 0} USD</td>
                    <td>{signal.total ? signal.total.toFixed(2): 0} USD</td>
                    <td>{signal.timestamp ? moment(signal.timestamp).format('DD.MM.YY HH:mm:ss') : ''}</td>
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    )
  }
  componentDidMount() {
    Store.mount(this.props.data.url)
  }
  componentWillUnmount() {
    Store.unmount()
  }
  addWidget(widget) {
    DashboardsStore.addWidget(widget)
  }
}

export default Intuition
