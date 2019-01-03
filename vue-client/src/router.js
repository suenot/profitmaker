import Vue from 'vue'
import Router from 'vue-router'
import Dashboard from './views/Dashboard.vue'
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
    }
  ]
})
