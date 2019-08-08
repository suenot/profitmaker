import Vue from 'vue'
import Router from 'vue-router'
// import Dashboard from './views/Dashboard/Dashboard.vue'
// import Accounting from './views/Accounting/Accounting.vue'
import Widget from './utils_components/Widget/Widget.vue'
import Deals from './core_components/Accounting/Deals/Deals.vue'
import Deal from './core_components/Accounting/Deal/Deal.vue'
import MyTrades from './core_components/Accounting/MyTrades/MyTrades.vue'
import Trade from './views/Trade/Trade.vue'
import Balance from './views/Balance/Balance.vue'
import Signals from './views/Signals/Signals.vue'
import Signal from './views/Signal/Signal.vue'

import SentimentsList from './core_components/Sentiments/List/List.vue'
import SentimentsCoin from './core_components/Sentiments/Coin/Coin.vue'
// import Chart from './components/Chart.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      redirect: { name: 'Trade' }
    },
    // {
    //   path: '/dashboard/:id',
    //   name: 'Dashboard',
    //   component: Dashboard,
    //   props: true,
    //   meta: { reuse: false }
    // },
    {
      path: '/trade',
      name: 'Trade',
      component: Trade,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/balance',
      name: 'Balance',
      component: Balance,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/signals',
      name: 'Signals',
      component: Signals,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/signal/:id',
      name: 'Signal',
      component: Signal,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/deals',
      name: 'Deals',
      component: Deals,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/deal/:id',
      name: 'Deal',
      component: Deal,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/my_trades',
      name: 'MyTrades',
      component: MyTrades,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/sentiments',
      name: 'SentimentsList',
      component: SentimentsList,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/sentiments/:id',
      name: 'SentimentsCoin',
      component: SentimentsCoin,
      props: true,
      meta: { reuse: false }
    },
    {
      path: '/widget/:id',
      name: 'Widget',
      component: Widget,
      props: true,
      meta: { reuse: false }
    },
  ]
})
