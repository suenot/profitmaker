import { observable, action, reaction, computed } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'

@version(1)
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
    '1': { id: '1', name: 'First', bg: '#ccc', icon: '/img/widgets/008-bone.svg', type: 'terminal', stock: 'BINANCE', pair: 'ETH_BTC', widgets: [], counter: 0},
    '2': { id: '2', name: 'Second', bg: '#ccc', icon: '/img/widgets/portfolio.svg', type: 'terminal', stock: 'LIQUI', pair: 'LTC_BTC', widgets: [], counter: 0},
  }
  @computed get name() { return this.dashboards[this.dashboardActiveId].name }
  @computed get stock() { return this.dashboards[this.dashboardActiveId].stock }
  @computed get stockLowerCase() { return (this.dashboards[this.dashboardActiveId].stock).toLowerCase() }
  @computed get pair() { return this.dashboards[this.dashboardActiveId].pair }
  @action setDashboard(id) {
    this.dashboardActiveId = id
  }
  @action addDashboard() {
    this.dashboardsCounter += 1
    this.dashboards[this.dashboardsCounter+""] = { id: this.dashboardsCounter+"", name: 'Dash', bg: '#ccc', icon: '/img/widgets/010-footprint.svg', type: 'terminal', stock: 'LIQUI', pair: 'LTC_BTC', widgets: [], counter: 0}
  }
  @action deleteDashboard(id) {
    delete this.dashboards[id]
    this.dashboardActiveId = '0'
  }

  @observable counter = 15
  @ignore @observable widgetsMarket = [
    { id: '0', icon: '/img/widgets/001-increasing-list-order.svg', component: './core_components/Orders/Orders.js', header: 'Orders asks', data: {type: 'asks'} },
    { id: '1', icon: '/img/widgets/003-sort-by-attributes.svg', component: './core_components/Orders/Orders.js', header: 'Orders bids', data: {type: 'bids'} },
    { id: '2', icon: '/img/widgets/019-pantheon.svg', component: './core_components/Stocks/Stocks.js', header: 'Stocks', data: {} },
    { id: '3', icon: '/img/widgets/008-bone.svg', component: './core_components/Pairs/Pairs.js', header: 'Pairs', data: {} },
    { id: '4', icon: '/img/widgets/funding-amounts.svg', component: './core_components/ReactStockcharts/HeikinAshi', header: 'OHLCV', data: {} },
    { id: '5', icon: '/img/widgets/033-auction.svg', component: './core_components/MyTrades/MyTrades.js', header: 'My trades', data: {} },
    { id: '6', icon: '/img/widgets/015-viking-ship.svg', component: './core_components/OpenOrders/OpenOrders.js', header: 'Open orders', data: {} },
    { id: '7', icon: '/img/widgets/010-footprint.svg', component: './core_components/Trades/Trades.js', header: 'Trades', data: {} },
    { id: '8', icon: '/img/widgets/plus.svg', component: './core_components/CreateOrder/CreateOrder.js', header: 'Limit buy', data: {type: 'buy'} },
    { id: '9', icon: '/img/widgets/minus.svg', component: './core_components/CreateOrder/CreateOrder.js', header: 'Limit sell', data: {type: 'sell'} },
    { id: '10', icon: '/img/widgets/portfolio.svg', component: './core_components/Balance/Balance.js', header: 'Total balance', data: {total: true} },
    { id: '11', icon: '/img/widgets/portfolio.svg', component: './core_components/Balance/Balance.js', header: 'Balance', data: {total: false} },
    { id: '12', icon: '/img/widgets/portfolio.svg', component: './core_components/BalancePie/BalancePie.js', header: 'Total balance', data: {total: true} },
    { id: '13', icon: '/img/widgets/portfolio.svg', component: './core_components/BalancePie/BalancePie.js', header: 'Balance', data: {total: false} },
    { id: '14', icon: '/img/widgets/portfolio.svg', component: './core_components/BalanceHistoryArea/BalanceHistoryArea.js', header: 'Total balance history', data: {total: true} },
    { id: '15', icon: '/img/widgets/portfolio.svg', component: './core_components/BalanceHistoryArea/BalanceHistoryArea.js', header: 'Balance history', data: {total: false} },
  ]
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
      i: this.dashboards[this.dashboardActiveId].counter+"", uid: dashboardName+'_'+this.dashboards[this.dashboardActiveId].counter, component: widget.component, header: widget.header, data: widget.data, x: 0, y: 0, w: 5, h: 19, minW: 2, minH: 3
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
