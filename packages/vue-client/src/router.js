import Vue from 'vue'
import Router from 'vue-router'
// import Dashboard from './views/Dashboard/Dashboard.vue'
// import Accounting from './views/Accounting/Accounting.vue'
import Deals from './core_components/Accounting/Deals/Deals.vue'
import Deal from './core_components/Accounting/Deal/Deal.vue'
import MyTrades from './views/MyTrades/MyTrades.vue'
import Trade from './views/Trade/Trade.vue'
import Balance from './views/Balance/Balance.vue'
import Signals from './views/Signals/Signals.vue'
import Signal from './views/Signal/Signal.vue'
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
  ]
})
