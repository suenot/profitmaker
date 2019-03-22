import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'
import axios from 'axios'
import dashboards from './data/dashboards'
import widgetsIcons from './data/widgetsIcons'
import widgetsMarket from './data/widgetsMarket'
import Alert from 'react-s-alert'
import uuidv1 from 'uuid/v1'

import SettingsStore from './SettingsStore'
import DrawersStore from './DrawersStore'


@version(17)
class DashboardsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init().then(() => {
      if (_.isEmpty(this.dashboards)) {
        this.dashboards = dashboards
        this.dashboardActiveId = _.find(this.dashboards, ['side', 'left']) && _.find(this.dashboards, ['side', 'left']).id || ''
      }
    })
    reaction(
      () => this.widgets,
      () => trunk.updateStore(this)
    )

  }
  @computed get terminalBackend() {return SettingsStore.terminalBackend.value }

  @observable dashboards = {}
  @observable dashboardActiveId = ''
  @ignore @observable drawerDashboardActiveId = ''

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
  @action setDrawerDashboard(id) {
    this.drawerDashboardActiveId = id
  }

  @action addDashboard(side) {
    var icon = '/img/widgets/' + _.sample(widgetsIcons)
    var id = uuidv1()
    this.dashboards[id] = { id: id, side: side, name: 'Untitled', bg: '#ccc', icon: icon, type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: []}
    var selector = _.find(widgetsMarket, ['name', 'selector'])
    this.addWidget(selector, id)

  }
  @action removeDashboard(id, side) {
    var dashboards = JSON.parse(JSON.stringify(this.dashboards))
    _.forEach(dashboards, (item, i) => {
      if (item.side !== side) delete dashboards[i]
    })
    if (Object.keys(dashboards).length > 1) {
      if (side === 'right') {
        DrawersStore.drawerClose('aside-right-first')
        DrawersStore.drawerClose('aside-right-second')
      }
      delete this.dashboards[id]
      var anotherKey = Object.keys(dashboards).filter((item) => { return item !== id})[0]
      if (side === 'left') this.dashboardActiveId = anotherKey
      // if (side === 'right') this.drawerDashboardActiveId = anotherKey
    } else {
      Alert.warning('You must have at least one dashboard')
    }
  }
  @action setDashboardName(name, dashboardId) {
    this.dashboards[dashboardId].name = name
  }
  @action setDashboardIcon(icon, dashboardId) {
    this.dashboards[dashboardId].icon = icon
  }
  @action setCustomHeader(dashboardId, widgetId, value) {
    _.find(this.dashboards[dashboardId].widgets, ['i', widgetId]).customHeader = value
  }
  @action setWidgetData(dashboardId, widgetId, key, value, fn) {
    if (value === 'true') value = true
    if (value === 'false') value = false
    if (fn === 'toUpperCase') value = value.toUpperCase()
    _.find(this.dashboards[dashboardId].widgets, ['i', widgetId]).data[key] = value
  }
  @action setWidgetsData(key, value, group) {

    var dashboards = [this.dashboards[this.dashboardActiveId], this.dashboards[this.drawerDashboardActiveId]]
    for (let dashboard of dashboards) {
      try {
        for (let i = 0; i<dashboard.widgets.length; i++) {
          // TODO: ALL groups
          var widget = dashboard.widgets[i]
          if (widget.data[key] !== undefined && ((widget.data.group === group) || (group === ""))) {
            this.dashboards[dashboard.id].widgets[i].data[key] = value
          }
        }
      } catch(err) {}
    }
  }

  @observable widgetsMarket = widgetsMarket
  @observable category = ''
  @action fetchWidgets(){
    axios.get(`/user-api/widgets/react`)
    .then((response) => {
      // if (response.data.length === 0) {
      //   // this.widgetsMarket = []
      // } else {
        this.widgetsMarket = response.data
      // }
    })
    .catch(() => {
      // this.widgetsMarket = []
    })
  }
  @action selectCategory(category) {
    this.category = category
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



  @action setLayout(layout, dashboardId) {
    // var widgets = _.clone(JSON.parse(JSON.stringify(this.dashboards[dashboardId].widgets)))
    var widgets = JSON.parse(JSON.stringify(this.dashboards[dashboardId].widgets))
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
    this.dashboards[dashboardId].widgets = widgets
  }

  @action addWidget(widget, _dashboardId) {
    var id = uuidv1()
    var dashboardId = _dashboardId || this.dashboardActiveId
    var widgetData = JSON.parse(JSON.stringify(widget.data))
    this.dashboards[dashboardId].widgets.push({
      i: id, uid: id, name: widget.name, component: widget.component, settings: widget.settings, settingsWidth: widget.settingsWidth, header: widget.header, customHeader: widget.customHeader, data: widgetData, x: 0, y: 0, w: widget.w || 7, h: widget.h || 15, minW: 2, minH: 3
    })

  }

  @action removeWidget(settings, data) {
    // Remove asides
    if ( DrawersStore.drawers['aside-left-first'].component === settings && JSON.stringify(DrawersStore.drawers['aside-left-first'].data) === JSON.stringify(data) ) DrawersStore.drawerClose('aside-left-first')
    if ( DrawersStore.drawers['aside-right-second'].component === settings && JSON.stringify(DrawersStore.drawers['aside-right-second'].data) === JSON.stringify(data) ) DrawersStore.drawerClose('aside-right-second')

    // Remove widget
    this.dashboards[data.dashboardId].widgets = _.filter(this.dashboards[data.dashboardId].widgets, function(item) {
      return item.i !== data.widgetId
    })
  }
  removeWidgetWithData(key, value) {
    DrawersStore.drawersClose()
    var dashboards = _.cloneDeep(this.dashboards)
    dashboards = _.map(dashboards, (dashboard, i)=>{
      var _dashboard = _.cloneDeep(dashboard)
      _dashboard.widgets = _.filter(_dashboard.widgets, function(widget) {
        return widget.data[key] !== value
      })
      return _dashboard
    })
    this.dashboards = dashboards
  }

  @action setGroup(dashboardId, widgetId, group) {
    var widgets = this.dashboards[dashboardId].widgets
    // _.forEach(widgets, (widget)=>{
    //   if (widget.data.group === group && widget.id !== widgetId) {
    //     this.setWidgetData(dashboardId, widgetId, 'groupColor', widget.data.groupColor)
    //     return true
    //   }
    // })
    // this.setWidgetData(dashboardId, widgetId, 'groupColor', undefined)

    for (let i=0; i<widgets.length; i++) {
      let widget = widgets[i]
      if (widget.data.group === group && widget.i !== widgetId) {
        this.setWidgetData(dashboardId, widgetId, 'groupColor', widget.data.groupColor)
        return true
      }
    }
    this.setWidgetData(dashboardId, widgetId, 'groupColor', '#000000')
  }
  @action setGroupColor(dashboardId, group, color) {
    var widgets = _.cloneDeep(this.dashboards[dashboardId].widgets)
    _.map(widgets, (widget) => {
      if (widget.data.group === group) widget.data.groupColor = color
      return widget
    })
    this.dashboards[dashboardId].widgets = widgets
  }

  @action openTemporaryDashboard(dashboardId) {
    // take stock and pair for temporary dashboard from widgets in active dashboard
    var widgets = _.cloneDeep(this.dashboards[dashboardId].widgets)
    for (let widget of widgets) {
      for (let _widget of this.dashboards[this.dashboardActiveId].widgets) {
        if ((widget.data.group === _widget.data.group) && (_widget.data.stock !== undefined) && (_widget.data.pair !== undefined)) {
          widget.data.stock = _widget.data.stock
          widget.data.pair = _widget.data.pair
          break
        }
      }
    }
    this.dashboards[dashboardId].widgets = widgets
  }
}

const store = window.DashboardsStore = new DashboardsStore()
export default store
