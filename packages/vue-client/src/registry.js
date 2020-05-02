import Vue from 'vue'


Vue.component('Accounting', require('@/core_components/Accounting/Accounting.vue').default)
Vue.component('Deals', require('@/core_components/Accounting/Deals/Deals.vue').default)
Vue.component('Deal', require('@/core_components/Accounting/Deal/Deal.vue').default)
Vue.component('Candles', require('@/core_components/Candles/Candles.vue').default)
Vue.component('Orders', require('@/core_components/Orders/Orders.vue').default)
Vue.component('OrdersSide', require('@/core_components/Orders/OrdersSide.vue').default)
Vue.component('CreateOrder', require('@/core_components/CreateOrder/CreateOrder.vue').default)
Vue.component('CreateOrderAside', require('@/core_components/CreateOrder/CreateOrderAside.vue').default)
Vue.component('OpenOrders', require('@/core_components/OpenOrders/OpenOrders.vue').default)
Vue.component('Trades', require('@/core_components/Trades/Trades.vue').default)
Vue.component('MyTrades', require('@/core_components/MyTrades/MyTrades.vue').default)
Vue.component('BalanceTable', require('@/core_components/Balance/BalanceTable.vue').default)
Vue.component('BalancePie', require('@/core_components/Balance/BalancePie.vue').default)
Vue.component('BalanceHistory', require('@/core_components/Balance/BalanceHistory.vue').default)
Vue.component('Selector', require('@/core_components/Selector/Selector.vue').default)
Vue.component('Stocks', require('@/core_components/Stocks/Stocks.vue').default)
Vue.component('Pairs', require('@/core_components/Pairs/Pairs.vue').default)
Vue.component('Signals', require('@/core_components/Signals/List/List.vue').default)
Vue.component('SignalCalculations', require('@/core_components/Signals/Calculations/Calculations.vue').default)
Vue.component('SignalHistory', require('@/core_components/Signals/History/History.vue').default)
Vue.component('SignalDetails', require('@/core_components/Signals/Details/Details.vue').default)
Vue.component('SignalAccounts', require('@/core_components/Signals/Accounts/Accounts.vue').default)

Vue.component('ReactStockcharts', require('@/core_components/Candles/ReactStockcharts/ReactStockcharts.js').default)
Vue.component('CandlesVchart', require('@/core_components/Candles/CandlesVchart/CandlesVchart.vue').default)
// Vue.component('ReactStockcharts', require('@/react_components/ReactStockcharts/index.js').default)

Vue.component('Trade', require('@/views/Trade/Trade.vue').default)
Vue.component('Balance', require('@/views/Balance/Balance.vue').default)
Vue.component('AccountingPage', require('@/views/Accounting/Accounting.vue').default)


Vue.component('Market', require('@/utils_components/Market/Market.vue').default)
Vue.component('Menu', require('@/utils_components/Menu/Menu.vue').default)
Vue.component('Aside', require('@/utils_components/Aside/Aside.vue').default)
Vue.component('Profile', require('@/utils_components/Profile/Profile.vue').default)
Vue.component('ProfileAside', require('@/utils_components/Profile/ProfileAside.vue').default)
Vue.component('Login', require('@/utils_components/Profile/Login.vue').default)
Vue.component('Logout', require('@/utils_components/Profile/Logout.vue').default)
Vue.component('Accounts', require('@/utils_components/Profile/Accounts.vue').default)
Vue.component('Widget', require('@/utils_components/Widget/Widget.vue').default)
Vue.component('Settings', require('@/utils_components/Settings/Settings.vue').default)


import moment from 'moment'
// var momentDurationFormatSetup = require("moment-duration-format")
// momentDurationFormatSetup(moment)

Vue.filter('commas', function (value) {
  if (value === undefined) return ''
  if (Array.isArray(value)) {
    if (value.length === 0) return ''
    return value.join(', ')
  } else {
    return value
  }
})

Vue.filter('toFixed', function (value, n) {
  if (value === undefined) return ''
  if (typeof(value) === 'string') return value
  return value.toFixed(n)
})

Vue.filter('fromNow', function (value, n) {
  if (value === undefined) return ''
  return moment(value).fromNow()
})

Vue.filter('duration', function (value) {
  if (!value) return ''
  return moment.duration(value).format('DD:hh:mm:ss')
})

Vue.filter('moment', function (value, type) {
  if (value === undefined) return ''
  if (type === 'default') return moment(value).format()
  if (type === 'dmyhms') return moment(value).format('DD:MM:YY hh:mm:ss')
  if (type === 'hms') return moment(value).format('hh:mm:ss')

})


