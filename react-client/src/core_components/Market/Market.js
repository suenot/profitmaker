/* eslint-disable import/first */
import React from 'react'
import _ from 'lodash'
import { observer } from 'mobx-react'
import Fab from '@material-ui/core/Fab'
import AddIcon from '@material-ui/icons/Add'
import ghLogo from'./github-logo.svg'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'
import ArrowBackIcon from '@material-ui/icons/ArrowBackIos'
import CloseIcon from '@material-ui/icons/Close'
import Divider from '@material-ui/core/Divider'

import DashboardsStore from 'stores/DashboardsStore'
import DrawersStore from 'stores/DrawersStore'

@observer
class Market extends React.Component {
  render() {
    return (
      <div className="market">
        <div className="categories">
          <div className="drawer-title">
            <div className="drawer-title-text">Widgets categories</div>
            <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
          </div>
          <Divider />
          <List component="nav">
            {
              _.map(DashboardsStore.categories, (category) => {
                return (
                  <ListItem key={category} button onClick={this.selectCategory.bind(this)}>
                    <ListItemText primary={category} />
                  </ListItem>
                )
              })
            }
          </List>
        </div>
        <div className="widgets simple hide">
          <div className="drawer-title">
            <ArrowBackIcon onClick={this.backToCategories.bind(this)} className="pointer" />
            <div className="drawer-title-text">{DashboardsStore.category}</div>
            <CloseIcon onClick={this.drawerRightClose.bind(this)} className="pointer" />
          </div>
          <Divider />
          {
            _.map(DashboardsStore.widgetsMarketFitered, (widget) => {
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
                        <Fab color="secondary" aria-label="Add" onClick={this.addWidget.bind(this, widget)}>
                          <AddIcon />
                        </Fab>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </div>
      </div>
    )
  }
  backToCategories() {
    document.querySelector('.market .categories').classList.toggle('hide')
    document.querySelector('.market .widgets').classList.toggle('hide')
  }
  selectCategory(e) {
    DashboardsStore.selectCategory(e.target.textContent)
    this.backToCategories()
  }
  componentWillMount() {
    DashboardsStore.fetchWidgets()
  }
  addWidget(widget) {
    DashboardsStore.addWidget(widget)
  }
  drawerRightClose() {
    DrawersStore.drawerRightClose()
  }
}

export default Market
