/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import { Button } from 'element-react'
import DashboardsStore from '../../stores/DashboardsStore'
import ghLogo from'./github-logo.svg'
@observer
class Market extends React.Component {
  render() {
    return (
      <div className="market simple">
        {
          _.map(DashboardsStore.widgetsMarket, (widget) => {
            var style = {
              backgroundImage: `url(${ require( "../../"+widget.img ) })`
            }
            return (
              <div className="market-widget" key={widget.id} style={style}>
                <div className="market-wrapper">
                  <div className="market-main">
                    <h3 className="market-header">{widget.header}</h3>
                    <p className="market-description">{widget.description}</p>
                  </div>
                  <div className="market-actions">
                    <div className="market-actions-autor">
                      <a href={widget.authorLink} target="_blank">{widget.author}</a>
                      <a className="market-actions-git" href={widget.source} target="_blank">
                        <img src={ghLogo} alt="github"/>
                      </a>
                    </div>
                    <div className="market-actions-action">
                      <Button type='success' onClick={this.addWidget.bind(this, widget)}>Add</Button>
                    </div>
                  </div>
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
