import { observable, action, autorun } from 'mobx'
import { version, AsyncTrunk, ignore } from 'mobx-sync'
import _ from 'lodash'

@version(1)
class DashboardsStore {
  @observable counter = 15
  @ignore @observable widgetsMarket = [
    { id: "0", icon: '/img/widgets/001-increasing-list-order.svg', component: './core_components/Orders', header: "Orders asks", data: {type: "asks"} },
    { id: "1", icon: '/img/widgets/003-sort-by-attributes.svg', component: './core_components/Orders', header: "Orders bids", data: {type: "bids"} },
    { id: "2", icon: '/img/widgets/019-pantheon.svg', component: './core_components/Stocks', header: "Stocks", data: {} },
    { id: "3", icon: '/img/widgets/008-bone.svg', component: './core_components/Pairs', header: "Pairs", data: {} },
    { id: "4", icon: '/img/widgets/funding-amounts.svg', component: './core_components/charts/HeikinAshi', header: "OHLCV", data: {} },
    { id: "5", icon: '/img/widgets/033-auction.svg', component: './core_components/MyTrades', header: "My trades", data: {} },
    { id: "6", icon: '/img/widgets/015-viking-ship.svg', component: './core_components/OpenOrders', header: "Open orders", data: {} },
    { id: "7", icon: '/img/widgets/010-footprint.svg', component: './core_components/Trades', header: "Trades", data: {} },
    { id: "8", icon: '/img/widgets/plus.svg', component: './core_components/CreateOrder', header: "Limit buy", data: {type: "buy"} },
    { id: "9", icon: '/img/widgets/minus.svg', component: './core_components/CreateOrder', header: "Limit sell", data: {type: "sell"} },
    { id: "10", icon: '/img/widgets/portfolio.svg', component: './core_components/Balance', header: "Total balance", data: {total: true} },
    { id: "11", icon: '/img/widgets/portfolio.svg', component: './core_components/Balance', header: "Balance", data: {total: false} },
    { id: "12", icon: '/img/widgets/portfolio.svg', component: './core_components/BalancePie', header: "Total balance", data: {total: true} },
    { id: "13", icon: '/img/widgets/portfolio.svg', component: './core_components/BalancePie', header: "Balance", data: {total: false} },
    { id: "14", icon: '/img/widgets/portfolio.svg', component: './core_components/BalanceHistoryArea', header: "Total balance history", data: {total: true} },
    { id: "15", icon: '/img/widgets/portfolio.svg', component: './core_components/BalanceHistoryArea', header: "Balance history", data: {total: false} },
  ]

  @observable widgets = [
    {i: "0", component: './core_components/Orders', header: "Orders asks", data: {type: "asks"}, x: 19, y: 0, w: 5, h: 19, minW: 2, minH: 3},
    {i: "1", component: './core_components/Orders', header: "Orders bids", data: {type: "bids"}, x: 19, y: 19, w: 5, h: 19, minW: 2, minH: 3},
    {i: "2", component: './core_components/Balance', header: "Total balance", data: {total: true}, x: 9, y: 51, w: 5, h: 13, minW: 2, minH: 3},
    {i: "3", component: './core_components/charts/HeikinAshi', header: "OHLCV", data: {}, x: 5, y: 0, w: 14, h: 23, minW: 2, minH: 3},
    {i: "4", component: './core_components/Balance', header: "Balance", data: {total: false}, x: 9, y: 38, w: 5, h: 13, minW: 2, minH: 3},
    {i: "5", component: './core_components/Pairs', header: "Pairs", data: {}, x: 0, y: 9, w: 5, h: 14, minW: 2, minH: 3},
    {i: "6", component: './core_components/Stocks', header: "Stocks", data: {}, x: 0, y: 0, w: 5, h: 9, minW: 2, minH: 3},
    {i: "7", component: './core_components/OpenOrders', header: "Open orders", data: {}, x: 0, y: 23, w: 9, h: 15, minW: 2, minH: 3},
    {i: "8", component: './core_components/MyTrades', header: "My trades", data: {}, x: 0, y: 38, w: 9, h: 13, minW: 2, minH: 3},
    {i: "9", component: './core_components/Trades', header: "Trades", data: {}, x: 0, y: 51, w: 9, h: 13, minW: 2, minH: 3},
    {i: "10", component: './core_components/CreateOrder', header: "Limit sell", data: {type: "sell"}, x: 14, y: 23, w: 5, h: 15, minW: 2, minH: 3},
    {i: "11", component: './core_components/CreateOrder', header: "Limit buy", data: {type: "buy"}, x: 9, y: 23, w: 5, h: 15, minW: 2, minH: 3},
    {i: "12", component: './core_components/BalancePie', header: "Total balance", data: {total: true}, x: 14, y: 51, w: 5, h: 13, minW: 2, minH: 3},
    {i: "13", component: './core_components/BalancePie', header: "Balance", data: {total: false}, x: 14, y: 38, w: 5, h: 13, minW: 2, minH: 3},
    {i: "14", component: './core_components/BalanceHistoryArea', header: "Balance history", data: {total: false}, x: 19, y: 38, w: 5, h: 13, minW: 2, minH: 3},
    {i: "15", component: './core_components/BalanceHistoryArea', header: "Total balance history", data: {total: true}, x: 19, y: 51, w: 5, h: 13, minW: 2, minH: 3},
  ]

  @action setLayout(layout) {
    var widgets = _.clone(JSON.parse(JSON.stringify(this.widgets)))
    for (var i = 0; i<widgets.length; i++) {
      for (var j = 0; j<layout.length; j++) {
        if (widgets[i].i === layout[j].i) {
          widgets[i].x = layout[j].x
          widgets[i].y = layout[j].y
          widgets[i].w = layout[j].w
          widgets[i].h = layout[j].h
          break
        }
      }
    }
    this.widgets = widgets
  }

  @action addWidget(widget) {
    this.counter += 1
    this.widgets.push({
      i: this.counter+"", component: widget.component, header: widget.header, data: widget.data, x: 19, y: 0, w: 5, h: 19, minW: 2, minH: 3
    })
  }

  @action removeWidget(id) {
    this.widgets = _.filter(this.widgets, function(item) {
      return item.i !== id;
    })
  }

}

const store = window.DashboardsStore = new DashboardsStore()

const trunk = new AsyncTrunk(store, { storage: localStorage, storageKey: 'dashboards' })
trunk.init()

autorun(() => {
  console.log(store.widgets)
  trunk.updateStore(store)
}, { delay: 1000 })

export default store
