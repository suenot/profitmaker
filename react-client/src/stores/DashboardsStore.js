import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'
import axios from 'axios'
import widgetsIcons from './data/widgetsIcons'
import widgetsMarket from './data/widgetsMarket'
import Alert from 'react-s-alert'
import uuidv1 from 'uuid/v1'

import SettingsStore from './SettingsStore'
import DrawersStore from './DrawersStore'


@version(11)
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
  @observable dashboardActiveId = "111"
  @ignore @observable drawerDashboardActiveId = ""

  // @observable dashboards = {
  //   '1': {"id":"1","name":"First","bg":"#ccc","icon":"/img/widgets/viking-ship.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets": [{"i":"1","uid":"1_1","name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","header":"Selector","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":0,"w":14,"h":5,"minW":2,"minH":3},{"i":"3","uid":"1_3","name":"candles","component":"core_components/ReactStockcharts/index.js","settings":"core_components/ReactStockcharts/Settings.js","settingsWidth":"300px","header":"Candles","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","timeframe":"1m","url": "${serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}","group":"","groupColor":""},"x":0,"y":5,"w":14,"h":39,"minW":2,"minH":3},{"i":"4","uid":"1_4","name":"orders","component":"core_components/Orders/Orders.js","settings":"core_components/Orders/Settings.js","settingsWidth":"300px","header":"Orders asks","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"asks","group":"","groupColor":""},"x":14,"y":26,"w":5,"h":31,"minW":2,"minH":3},{"i":"5","uid":"1_5","name":"orders","component":"core_components/Orders/Orders.js","settings":"core_components/Orders/Settings.js","settingsWidth":"300px","header":"Orders bids","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"bids","group":"","groupColor":""},"x":19,"y":26,"w":5,"h":31,"minW":2,"minH":3},{"i":"6","uid":"1_6","name":"trades","component":"core_components/Trades/Trades.js","settings":"core_components/Trades/Settings.js","settingsWidth":"300px","header":"Trades","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":14,"y":57,"w":10,"h":18,"minW":2,"minH":3},{"i":"7","uid":"1_7","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit buy","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"buy","group":"","groupColor":""},"x":14,"y":0,"w":5,"h":26,"minW":2,"minH":3},{"i":"8","uid":"1_8","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit sell","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"sell","group":"","groupColor":""},"x":19,"y":0,"w":5,"h":26,"minW":2,"minH":3},{"i":"9","uid":"1_9","name":"open-orders","component":"core_components/OpenOrders/OpenOrders.js","settings":"core_components/OpenOrders/Settings.js","settingsWidth":"300px","header":"Open orders","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":7,"y":44,"w":7,"h":31,"minW":2,"minH":3},{"i":"10","uid":"1_10","name":"my-trades","component":"core_components/MyTrades/MyTrades.js","settings":"core_components/MyTrades/Settings.js","settingsWidth":"300px","header":"My trades","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":44,"w":7,"h":31,"minW":2,"minH":3}]},
  // }
  // @observable dashboards = ["d81cd720-1969-11e9-9edb-bd938ce9490b", "b73da1c0-1a7b-11e9-aa44-7959f52cfb9d", "b73da1c0-1a7b-11e9-aa44-7959f52cfb7d"]
  // dashboardsDict = { }
  @observable dashboards = {
    "111": {"id":"111","side":"left","name":"Trading","bg":"#ccc","icon":"/img/widgets/auction.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets":[{"i":"d81cd721-1969-11e9-9edb-bd938ce9490b","uid":"d81cd721-1969-11e9-9edb-bd938ce9490b","name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","header":"Selector","customHeader":"","data":{"stock":"BINANCE","pair":"QTUM_ETH","group":"","groupColor":""},"x":15,"y":0,"w":9,"h":8,"minW":2,"minH":3},{"i":"0d160fc0-1a7b-11e9-aa44-7959f52cfb9d","uid":"0d160fc0-1a7b-11e9-aa44-7959f52cfb9d","name":"candles","component":"core_components/ReactStockcharts/index.js","settings":"core_components/ReactStockcharts/Settings.js","settingsWidth":"300px","header":"Candles","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","timeframe":"1m","url":"${serverBackend}/${stockLowerCase}/candles/${pair}/${timeframe}","group":"","groupColor":""},"x":0,"y":0,"w":15,"h":54,"minW":2,"minH":3},{"i":"8c89a000-1a7b-11e9-aa44-7959f52cfb9d","uid":"8c89a000-1a7b-11e9-aa44-7959f52cfb9d","name":"open-orders","component":"core_components/OpenOrders/OpenOrders.js","settings":"core_components/OpenOrders/Settings.js","settingsWidth":"300px","header":"Open orders","customHeader":"","data":{"demo":true,"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":54,"w":15,"h":14,"minW":2,"minH":3},{"i":"8d278db0-1a7b-11e9-aa44-7959f52cfb9d","uid":"8d278db0-1a7b-11e9-aa44-7959f52cfb9d","name":"my-trades","component":"core_components/MyTrades/MyTrades.js","settings":"core_components/MyTrades/Settings.js","settingsWidth":"300px","header":"My trades","customHeader":"","data":{"demo":true,"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":0,"y":68,"w":15,"h":14,"minW":2,"minH":3},{"i":"0d3127f0-32dc-11e9-93db-5fb259f80bb1","uid":"0d3127f0-32dc-11e9-93db-5fb259f80bb1","name":"orders","component":"core_components/Orders/Orders.js","settings":"core_components/Orders/Settings.js","settingsWidth":"300px","header":"Orders asks","customHeader":"","data":{"demo":false,"stock":"BINANCE","pair":"ETH_BTC","type":"both","visualMode":"crocodile","visualModeMax":"total sum","visualModeCrocodileMax":10000,"visualModeWallsMax":1000,"group":"","groupColor":""},"x":15,"y":8,"w":5,"h":74,"minW":2,"minH":3},{"i":"89b6c000-32dc-11e9-8762-e996eaba2aa2","uid":"89b6c000-32dc-11e9-8762-e996eaba2aa2","name":"trades","component":"core_components/Trades/Trades.js","settings":"core_components/Trades/Settings.js","settingsWidth":"300px","header":"Trades","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","group":"","groupColor":""},"x":20,"y":8,"w":4,"h":74,"minW":2,"minH":3}]},
    "222": {"id":"222", "side": "left", "name":"Balance","bg":"#ccc","icon":"/img/widgets/portfolio.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets":[{"i":"bdb50ed0-1a7b-11e9-aa44-7959f52cfb9d","uid":"bdb50ed0-1a7b-11e9-aa44-7959f52cfb9d","name":"balance-history-area","component":"core_components/BalanceHistoryArea/BalanceHistoryArea.js","settings":"core_components/BalanceHistoryArea/Settings.js","settingsWidth":"300px","header":"Total balance history","customHeader":"","data":{"demo":true,"stock":"TOTAL","stockTemp":"BINANCE","total":true,"type":"history","group":"","groupColor":""},"x":0,"y":37,"w":14,"h":45,"minW":2,"minH":3},{"i":"c9c0dbf0-1a7b-11e9-aa44-7959f52cfb9d","uid":"c9c0dbf0-1a7b-11e9-aa44-7959f52cfb9d","name":"balance-table","component":"core_components/Balance/Balance.js","settings":"core_components/Balance/Settings.js","settingsWidth":"300px","header":"Total balance","customHeader":"","data":{"demo":true,"stock":"TOTAL","stockTemp":"BINANCE","total":true,"type":"now","group":"","groupColor":""},"x":8,"y":0,"w":6,"h":37,"minW":2,"minH":3},{"i":"fd74ca60-1a7b-11e9-8e81-a7f003e582d4","uid":"fd74ca60-1a7b-11e9-8e81-a7f003e582d4","name":"balance-pie","component":"core_components/BalancePie/BalancePie.js","settings":"core_components/BalancePie/Settings.js","settingsWidth":"300px","header":"Total balance","customHeader":"","data":{"demo":true,"stock":"TOTAL","stockTemp":"BINANCE","total":true,"type":"now","group":"","groupColor":""},"x":0,"y":0,"w":8,"h":37,"minW":2,"minH":3},{"i":"033e4430-1a7c-11e9-8e81-a7f003e582d4","uid":"033e4430-1a7c-11e9-8e81-a7f003e582d4","name":"note","component":"core_components/Note/Note.js","settings":"core_components/Note/Settings.js","settingsWidth":"300px","header":"Note","customHeader":"","data":{"noteId":"1"},"x":14,"y":0,"w":10,"h":36,"minW":2,"minH":3},{"i":"05af6b40-1a7c-11e9-8e81-a7f003e582d4","uid":"05af6b40-1a7c-11e9-8e81-a7f003e582d4","name":"iframe","component":"core_components/Iframe/Iframe.js","settings":"core_components/Iframe/Settings.js","settingsWidth":"300px","header":"Iframe","customHeader":"","data":{"demo":false,"url":"http://dolphin.bi/apps/x/top-ico/index.html"},"x":14,"y":36,"w":10,"h":45,"minW":2,"minH":3}]},
    "333": {"id":"333","side":"right","name":"Buy/Sell","bg":"#ccc","icon":"/img/widgets/exchange-1.svg","type":"terminal","stock":"BINANCE","pair":"ETH_BTC","widgets":[{"i":"05d389c0-2afe-11e9-a393-473a5b460de0","uid":"05d389c0-2afe-11e9-a393-473a5b460de0","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit buy","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"buy","group":"","groupColor":""},"x":0,"y":0,"w":12,"h":27,"minW":2,"minH":3},{"i":"0631af50-2afe-11e9-a393-473a5b460de0","uid":"0631af50-2afe-11e9-a393-473a5b460de0","name":"create-order","component":"core_components/CreateOrder/CreateOrder.js","settings":"core_components/CreateOrder/Settings.js","settingsWidth":"300px","header":"Limit sell","customHeader":"","data":{"stock":"BINANCE","pair":"ETH_BTC","type":"sell","group":"","groupColor":""},"x":0,"y":27,"w":12,"h":27,"minW":2,"minH":3}]}
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
  @action setDrawerDashboard(id) {
    this.drawerDashboardActiveId = id
  }

  @action addDashboard(side) {
    var icon = '/img/widgets/' + _.sample(widgetsIcons)
    var id = uuidv1()
    this.dashboards[id] = { id: id, side: side, name: 'Untitled', bg: '#ccc', icon: icon, type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: []}
    this.addWidget({"name":"selector","component":"core_components/Selector/Selector.js","settings":"core_components/Selector/Settings.js","settingsWidth":"300px","img":"core_components/Selector/Selector.png","header":"Selector","customHeader":"","description":"","author":"#core","authorLink":"https://github.com/kupi-network/kupi-terminal","source":"https://github.com/kupi-network/kupi-terminal/blob/master/react-client/src/core_components/Selector/Selector.js","data":{"stock": "BINANCE", "pair": "ETH_BTC", "group":"", "groupColor": "" },"categories":["utils"],"w":7,"h":5}, id)

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
    var dashboard = this.dashboards[this.dashboardActiveId]
    for (let i = 0; i<dashboard.widgets.length; i++) {
      // TODO: ALL groups
      var widget = dashboard.widgets[i]
      if (widget.data[key] !== undefined && ((widget.data.group === group) || (group === ""))) {
        this.dashboards[this.dashboardActiveId].widgets[i].data[key] = value
      }
    }
  }

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
    if ( DrawersStore.drawerRightComponent === settings && JSON.stringify(DrawersStore.drawerRightData) === JSON.stringify(data) ) {
      DrawersStore.drawerRightClose()
    }
    this.dashboards[data.dashboardId].widgets = _.filter(this.dashboards[data.dashboardId].widgets, function(item) {
      return item.i !== data.widgetId
    })
  }
  removeWidgetWithData(key, value) {
    DrawersStore.drawerRightSet('core_components/Empty', '0px', {}, '', '')
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
