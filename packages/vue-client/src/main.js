import Vue from 'vue'
import App from './App.vue'
import router from './router'

import './registry'
// import Chart from './utils_components/Chart.vue'
// Vue.component('Chart', Chart)

import Movue from 'movue'
import * as mobx from 'mobx'
Vue.use(Movue, mobx)

import { VuePlugin } from 'vuera'
Vue.use(VuePlugin)

import "vue-virtual-scroller/dist/vue-virtual-scroller.css"
import VueVirtualScroller from 'vue-virtual-scroller'
Vue.use(VueVirtualScroller)

import VueBus from 'vue-bus'
Vue.use(VueBus)

import vuejsStorage from 'vuejs-storage'
Vue.use(vuejsStorage)

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
Vue.use(ElementUI)

import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
Vue.use(Vuetify, {
  theme: {
    primary: '#3f51b5',
    secondary: '#b0bec5',
    accent: '#8c9eff',
    error: '#b71c1c'
  }
})

import VCharts from 'v-charts'
Vue.use(VCharts)


import vueShortkey from 'vue-shortkey'
Vue.use(vueShortkey, { prevent: ['input', 'textarea'] })


Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')


// export const bus = new Vue({
//   components: {
//     EmitterComponent,
//     ListenComponent
//   }
// })
