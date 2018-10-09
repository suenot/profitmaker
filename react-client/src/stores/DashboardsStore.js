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
  @computed get icon() { return this.dashboards[this.dashboardActiveId].icon }

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
    {
      id: '0',
      component: './core_components/Orders/Orders.js',
      header: 'Orders asks',
      description: 'People want to sell coins',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {type: 'asks'}
    },
    {
      id: '1',
      component: './core_components/Orders/Orders.js',
      header: 'Orders bids',
      description: 'People want to buy coins',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {type: 'bids'}
    },
    {
      id: '2',
      component: './core_components/Stocks/Stocks.js',
      header: 'Stocks',
      description: 'List of cryptostocks',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '3',
      component: './core_components/Pairs/Pairs.js',
      header: 'Pairs',
      description: 'Pairs of cryptostock',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '4',
      component: './core_components/ReactStockcharts/HeikinAshi',
      header: 'OHLCV',
      description: 'Open-High-Low-Close-Value candles chart',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '5',
      component: './core_components/MyTrades/MyTrades.js',
      header: 'My trades',
      description: 'History of my trades',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '6',
      component: './core_components/OpenOrders/OpenOrders.js',
      header: 'Open orders',
      description: 'My open orders',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '7',
      component: './core_components/Trades/Trades.js',
      header: 'Trades',
      description: 'People trades',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {}
    },
    {
      id: '8',
      component: './core_components/CreateOrder/CreateOrder.js',
      header: 'Limit buy',
      description: 'Place order to buy',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {type: 'buy'}
    },
    {
      id: '9',
      component: './core_components/CreateOrder/CreateOrder.js',
      header: 'Limit sell',
      description: 'Place order to buy',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {type: 'sell'}
    },
    {
      id: '10',
      component: './core_components/Balance/Balance.js',
      header: 'Total balance',
      description: 'Table view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: true}
    },
    {
      id: '11',
      component: './core_components/Balance/Balance.js',
      header: 'Balance',
      description: 'Table view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: false}
    },
    {
      id: '12',
      component: './core_components/BalancePie/BalancePie.js',
      header: 'Total balance',
      description: 'Pie chart view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: true}
    },
    {
      id: '13',
      component: './core_components/BalancePie/BalancePie.js',
      header: 'Balance',
      description: 'Pie chart view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: false}
    },
    {
      id: '14',
      component: './core_components/BalanceHistoryArea/BalanceHistoryArea.js',
      header: 'Total balance history',
      description: 'Stacked area chart view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: true}
    },
    {
      id: '15',
      component: './core_components/BalanceHistoryArea/BalanceHistoryArea.js',
      header: 'Balance history',
      description: 'Stacked area chart view',
      author: '#core',
      authorLink: 'https://github.com/kupi-network/kupi-terminal',
      source: 'https://github.com/kupi-network/kupi-terminal',
      data: {total: false}
    },
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
