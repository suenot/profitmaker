import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import axios from 'axios'
import widgetsIcons from './data/widgetsIcons'
import Alert from 'react-s-alert'

import SettingsStore from './SettingsStore'


@version(3)
class DashboardsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init()
    reaction(
      () => this.widgets,
      () => trunk.updateStore(this)
    )
  }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }
  @observable dashboardsCounter = 2
  @observable dashboardActiveId = '1'
  @observable dashboards = {
    '1': { id: '1', name: 'First', bg: '#ccc', icon: '/img/widgets/viking-ship.svg', type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: [], counter: 0},
    '2': { id: '2', name: 'Second', bg: '#ccc', icon: '/img/widgets/helmet.svg', type: 'terminal', stock: 'LIQUI', pair: 'LTC_BTC', widgets: [], counter: 0}
  }
  @computed get name() { return this.dashboards[this.dashboardActiveId].name }
  @computed get stock() {
    return this.dashboards[this.dashboardActiveId].stock
  }
  @computed get stockLowerCase() { return (this.dashboards[this.dashboardActiveId].stock).toLowerCase() }
  @computed get pair() { return this.dashboards[this.dashboardActiveId].pair }
  @computed get icon() { return this.dashboards[this.dashboardActiveId].icon }

  @action setDashboard(id) {
    this.dashboardActiveId = id
    // document.title = this.dashboards[this.dashboardActiveId].name
  }
  @action addDashboard() {
    this.dashboardsCounter += 1
    var icon = '/img/widgets/' + _.sample(widgetsIcons)
    this.dashboards[this.dashboardsCounter+""] = { id: this.dashboardsCounter+"", name: 'Untitled', bg: '#ccc', icon: icon, type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: [], counter: 0}
  }
  @action removeDashboard(id) {
    if (Object.keys(this.dashboards).length > 1) {
      delete this.dashboards[id]
      this.dashboardActiveId = Object.keys(this.dashboards)[0]
    } else {
      Alert.warning('You must have at least one dashboard', {
        position: 'bottom-right',
        effect: 'scale',
        beep: false,
        timeout: 'none'
      })
    }
  }
  @action setDashboardName(name) {
    this.dashboards[this.dashboardActiveId].name = name
  }
  @action setDashboardIcon(icon) {
    this.dashboards[this.dashboardActiveId].icon = icon
  }
  @action setCustomHeader(dashboardId, widgetId, value) {
    _.find(this.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader = value
  }
  @action setWidgetData(dashboardId, widgetId, key, value) {
    if (value === 'true') value = true
    if (value === 'false') value = false
    _.find(this.dashboards[dashboardId].widgets, ['i', widgetId]).data[key] = value
  }
  @action setWidgetsData(key, value) {
    for (let i = 0; i<this.dashboards[this.dashboardActiveId].widgets.length; i++) {
      if (this.dashboards[this.dashboardActiveId].widgets[i].data[key] !== undefined) {
        this.dashboards[this.dashboardActiveId].widgets[i].data[key] = value
      }
    }
  }

  @observable counter = 15

  @observable widgetsMarket = []
  @observable category = ''
  @action fetchWidgets(){
    axios.get(`${this.terminalBackend}/widgets/`)
    .then((response) => {
      if (response.data.length === 0) {
        // this.widgetsMarket = []
      } else {
        this.widgetsMarket = response.data
      }
    })
    .catch(() => {
      this.trades = []
    })
  }
  @action selectCategory(category) {
    this.category = category.toLowerCase()
  }
  @computed get widgetsMarketFitered() {
    return _.filter(this.widgetsMarket, (widget)=>{
      if ( _.includes(widget.categories, this.category) ) return true
      return false
    })
  }
  @computed get categories() {
    var categories = new Set()
    _.forEach(this.widgetsMarket, (widget)=>{
      _.forEach(widget.categories, (category)=>{
        categories.add(category)
      })
    })
    return Array.from(categories)
  }
  // @action widgetsMarketFiter(category) {
  //   return _.filter(this.widgetsMarket, (widget)=>{
  //     if ( _.includes(widget.categories, category) ) return true
  //     return false
  //   })
  // }



  @action setLayout(layout) {
    var widgets = _.clone(JSON.parse(JSON.stringify(this.dashboards[this.dashboardActiveId].widgets)))
    for (var i = 0; i<widgets.length; i++) {
      for (var j = 0; j<layout.length; j++) {
        if (widgets[i].uid === layout[j].i) {
          widgets[i].x = layout[j].x
          widgets[i].y = layout[j].y
          widgets[i].w = layout[j].w
          widgets[i].h = layout[j].h
          break
        }
      }
    }
    this.dashboards[this.dashboardActiveId].widgets = widgets
  }

  @action addWidget(widget) {
    var activeDashboard = this.dashboardActiveId
    this.dashboards[this.dashboardActiveId].counter = (parseInt(this.dashboards[this.dashboardActiveId].counter, 10) + 1).toString()
    this.dashboards[this.dashboardActiveId].widgets.push({
      i: this.dashboards[this.dashboardActiveId].counter+"", uid: activeDashboard+'_'+this.dashboards[this.dashboardActiveId].counter, name: widget.name, component: widget.component, settings: widget.settings, settingsWidth: widget.settingsWidth, header: widget.header, customHeader: widget.customHeader, data: widget.data, x: 0, y: 0, w: widget.w || 7, h: widget.h || 15, minW: 2, minH: 3
    })
  }

  @action removeWidget(id) {
    this.dashboards[this.dashboardActiveId].widgets = _.filter(this.dashboards[this.dashboardActiveId].widgets, function(item) {
      return item.i !== id
    })
  }
}

const store = window.DashboardsStore = new DashboardsStore()
export default store
