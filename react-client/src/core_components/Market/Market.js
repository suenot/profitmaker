import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import DashboardsStore from '../../stores/DashboardsStore'

@observer
class Market extends React.Component {
  render() {
    return (
      <div className="market simple">
        {
          _.map(DashboardsStore.widgetsMarket, (widget) => {
            return (
              <div className="market-widget" key={widget.id}>
                <div className="market-main">
                  <h3 className="market-header">{widget.header}</h3>
                  <p className="market-description">bla-bla-bla</p>
                </div>
                <div className="market-actions">
                  <a href="https://www.facebook.com/decenot">@suenot</a>
                  <a href="https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Orders.js">Github</a>
                  <button onClick={this.addWidget.bind(this, widget)}>Add</button>
                </div>
              </div>
            )
          })
        }
      </div>
    )
  }
  addWidget(widget) {
    DashboardsStore.addWidget(widget)
  }
}

export default Market
