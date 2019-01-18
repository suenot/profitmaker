import Vue from 'vue'
import App from './App/App.vue'
import router from './router'

import './registry'
// import Chart from './utils_components/Chart.vue'
// Vue.component('Chart', Chart)

import VueBus from 'vue-bus'
Vue.use(VueBus)

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
