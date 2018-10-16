import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'
import widgetsMarket from './data/widgetsMarket'
import widgetsIcons from './data/widgetsIcons'
import Alert from 'react-s-alert'

@version(2)
class DashboardsStore {
  constructor() {
    const trunk = new AsyncTrunk(this, { storage: localStorage, storageKey: 'dashboards' })
    trunk.init()
    reaction(
      () => this.widgets,
      () => trunk.updateStore(this)
    )
  }
  @observable dashboardsCounter = 2
  @observable dashboardActiveId = '1'
  @observable dashboards = {
    '1': { id: '1', name: 'First', bg: '#ccc', icon: '/img/widgets/viking-ship.svg', type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: [], counter: 0},
    '2': { id: '2', name: 'Second', bg: '#ccc', icon: '/img/widgets/helmet.svg', type: 'terminal', stock: 'LIQUI', pair: 'LTC_BTC', widgets: [], counter: 0},
  }
  @computed get name() { return this.dashboards[this.dashboardActiveId].name }
  @computed get stock() { return this.dashboards[this.dashboardActiveId].stock }
  @computed get stockLowerCase() { return (this.dashboards[this.dashboardActiveId].stock).toLowerCase() }
  @computed get pair() { return this.dashboards[this.dashboardActiveId].pair }
  @computed get icon() { return this.dashboards[this.dashboardActiveId].icon }

  @action setDashboard(id) {
    this.dashboardActiveId = id
  }
  @action addDashboard() {
    this.dashboardsCounter += 1
    var icon = '/img/widgets/' + _.sample(widgetsIcons)
    this.dashboards[this.dashboardsCounter+""] = { id: this.dashboardsCounter+"", name: 'Dash', bg: '#ccc', icon: icon, type: 'terminal', stock: 'LIQUI', pair: 'LTC_BTC', widgets: [], counter: 0}
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

  @observable counter = 15
  @ignore @observable widgetsMarket = widgetsMarket
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
    var dashboardName = this.dashboards[this.dashboardActiveId].name
    this.dashboards[this.dashboardActiveId].counter = (parseInt(this.dashboards[this.dashboardActiveId].counter, 10) + 1).toString()
    this.dashboards[this.dashboardActiveId].widgets.push({
      i: this.dashboards[this.dashboardActiveId].counter+"", uid: dashboardName+'_'+this.dashboards[this.dashboardActiveId].counter, name: widget.name, component: widget.component, settings: widget.settings, settingsWidth: widget.settingsWidth, header: widget.header, data: widget.data, x: 0, y: 0, w: 5, h: 19, minW: 2, minH: 3
    })
  }

  @action removeWidget(id) {
    this.dashboards[this.dashboardActiveId].widgets = _.filter(this.dashboards[this.dashboardActiveId].widgets, function(item) {
      return item.i !== id;
    })
  }

}

const store = window.DashboardsStore = new DashboardsStore()
export default store
