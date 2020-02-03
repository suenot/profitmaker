import Vue from 'vue'
import VueRouter from 'vue-router'
import Trade from '@/views/Trade/Trade.vue'

Vue.use(VueRouter)

const routes = [
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
  }
  // {
  //   path: '/balance',
  //   name: 'Balance',
  //   component: Balance,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/signals',
  //   name: 'Signals',
  //   component: Signals,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/signal/:id',
  //   name: 'Signal',
  //   component: Signal,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/deals',
  //   name: 'Deals',
  //   component: Deals,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/deal/:id',
  //   name: 'Deal',
  //   component: Deal,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/my_trades',
  //   name: 'MyTrades',
  //   component: MyTrades,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/sentiments',
  //   name: 'SentimentsList',
  //   component: SentimentsList,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/sentiments/:id',
  //   name: 'SentimentsCoin',
  //   component: SentimentsCoin,
  //   props: true,
  //   meta: { reuse: false }
  // },
  // {
  //   path: '/widget/:id',
  //   name: 'Widget',
  //   component: Widget,
  //   props: true,
  //   meta: { reuse: false }
  // },
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
