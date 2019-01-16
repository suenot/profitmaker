import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk } from 'mobx-sync'
import _ from 'lodash'
import axios from 'axios'
import widgetsIcons from './data/widgetsIcons'
import widgetsMarket from './data/widgetsMarket'
import Alert from 'react-s-alert'

import SettingsStore from './SettingsStore'
import DrawersStore from './DrawersStore'


@version(5)
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
    '1': {"id":"1","name":"First","bg":"#ccc","icon":"/img/widgets/viking-ship.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets": [{"i":"1","uid":"1_1","name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","header":"Selector","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":0,"w":14,"h":5,"minW":2,"minH":3},{"i":"3","uid":"1_3","name":"candles","component":"core_components/ReactStockcharts/index.js","settings":"core_components/ReactStockcharts/Settings.js","settingsWidth":"300px","header":"Candles","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","timeframe":"1m","url": "${serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}","group":"","groupColor":""},"x":0,"y":5,"w":14,"h":39,"minW":2,"minH":3},{"i":"4","uid":"1_4","name":"orders","component":"core_components/Orders/Orders.js","settings":"core_components/Orders/Settings.js","settingsWidth":"300px","header":"Orders asks","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"asks","group":"","groupColor":""},"x":14,"y":26,"w":5,"h":31,"minW":2,"minH":3},{"i":"5","uid":"1_5","name":"orders","component":"core_components/Orders/Orders.js","settings":"core_components/Orders/Settings.js","settingsWidth":"300px","header":"Orders bids","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"bids","group":"","groupColor":""},"x":19,"y":26,"w":5,"h":31,"minW":2,"minH":3},{"i":"6","uid":"1_6","name":"trades","component":"core_components/Trades/Trades.js","settings":"core_components/Trades/Settings.js","settingsWidth":"300px","header":"Trades","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":14,"y":57,"w":10,"h":18,"minW":2,"minH":3},{"i":"7","uid":"1_7","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit buy","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"buy","group":"","groupColor":""},"x":14,"y":0,"w":5,"h":26,"minW":2,"minH":3},{"i":"8","uid":"1_8","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit sell","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"sell","group":"","groupColor":""},"x":19,"y":0,"w":5,"h":26,"minW":2,"minH":3},{"i":"9","uid":"1_9","name":"open-orders","component":"core_components/OpenOrders/OpenOrders.js","settings":"core_components/OpenOrders/Settings.js","settingsWidth":"300px","header":"Open orders","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":7,"y":44,"w":7,"h":31,"minW":2,"minH":3},{"i":"10","uid":"1_10","name":"my-trades","component":"core_components/MyTrades/MyTrades.js","settings":"core_components/MyTrades/Settings.js","settingsWidth":"300px","header":"My trades","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":44,"w":7,"h":31,"minW":2,"minH":3}],"counter":"9"},
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
    this.addWidget({"name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","img":"core_components/Selector/Selector.png","header":"Selector","customHeader":"","description":"","author":"#core","authorLink":"https://github.com/kupi-network/kupi-terminal","source":"https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Selector/Selector.js","data":{"stock": "BINANCE", "pair": "ETH_BTC", "group":"", "groupColor": "" },"categories":["utils"],"w":7,"h":5}, this.dashboardsCounter)

  }
  @action removeDashboard(id) {
    if (Object.keys(this.dashboards).length > 1) {
      delete this.dashboards[id]
      this.dashboardActiveId = Object.keys(this.dashboards)[0]
    } else {
      Alert.warning('You must have at least one dashboard')
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
  @action setWidgetData(dashboardId, widgetId, key, value, fn) {
    if (value === 'true') value = true
    if (value === 'false') value = false
    if (fn === 'toUpperCase') value = value.toUpperCase()
    _.find(this.dashboards[dashboardId].widgets, ['i', widgetId]).data[key] = value
  }
  @action setWidgetsData(key, value, group) {
    var dashboard = this.dashboards[this.dashboardActiveId]
    for (let i = 0; i<dashboard.widgets.length; i++) {
      // TODO: ALL groups
      var widget = dashboard.widgets[i]
      if (widget.data[key] !== undefined && ((widget.data.group === group) || (group === ""))) {
        this.dashboards[this.dashboardActiveId].widgets[i].data[key] = value
      }
    }
  }

  @observable counter = 15

  @observable widgetsMarket = widgetsMarket
  @observable category = ''
  @action fetchWidgets(){
    axios.get(`${this.terminalBackend}/widgets/react`)
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

  @action addWidget(widget, _dashboardId) {
    var dashboardId = _dashboardId || this.dashboardActiveId
    // var activeDashboard = this.dashboardActiveId
    this.dashboards[dashboardId].counter = (parseInt(this.dashboards[dashboardId].counter, 10) + 1).toString()
    this.dashboards[dashboardId].widgets.push({
      i: this.dashboards[dashboardId].counter+"", uid: dashboardId+'_'+this.dashboards[dashboardId].counter, name: widget.name, component: widget.component, settings: widget.settings, settingsWidth: widget.settingsWidth, header: widget.header, customHeader: widget.customHeader, data: widget.data, x: 0, y: 0, w: widget.w || 7, h: widget.h || 15, minW: 2, minH: 3
    })
  }

  @action removeWidget(id) {
    DrawersStore.drawerRightSet('core_components/Empty', '0px')
    DrawersStore.drawerRightClose()
    this.dashboards[this.dashboardActiveId].widgets = _.filter(this.dashboards[this.dashboardActiveId].widgets, function(item) {
      return item.i !== id
    })
  }
  removeWidgetWithData(key, value) {
    DrawersStore.drawerRightSet('core_components/Empty', '0px')
    DrawersStore.drawerRightClose()
    var dashboards = _.cloneDeep(this.dashboards)
    _.forEach(dashboards, (dashboard, i)=>{
      var _dashboard = _.cloneDeep(dashboard)
      _dashboard.widgets = _.filter(_dashboard.widgets, function(widget) {
        return widget.data[key] !== value
      })
      dashboards[i] = _dashboard
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

}

const store = window.DashboardsStore = new DashboardsStore()
export default store
