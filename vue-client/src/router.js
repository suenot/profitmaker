import Vue from 'vue'
import Router from 'vue-router'
import Dashboard from './views/Dashboard/Dashboard.vue'
import Trade from './views/Trade/Trade.vue'
import Balance from './views/Balance/Balance.vue'
// import Chart from './components/Chart.vue'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/dashboard/:id',
      name: 'Dashboard',
      component: Dashboard,
      // props: true,
      meta: { reuse: false }
    },
    {
      path: '/trade',
      name: 'Trade',
      component: Trade,
      // props: true,
      meta: { reuse: false }
    },
    {
      path: '/balance',
      name: 'Balance',
      component: Balance,
      // props: true,
      meta: { reuse: false }
    }
  ]
})
