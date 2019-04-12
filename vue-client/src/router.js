import Vue from 'vue'
import Router from 'vue-router'
// import Dashboard from './views/Dashboard/Dashboard.vue'
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
  ]
})
