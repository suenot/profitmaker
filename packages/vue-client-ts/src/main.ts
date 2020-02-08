import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import router from './router'
import './registry'
import store from './store'

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'

const { VuePlugin } = require('vuera')
Vue.use(VuePlugin)

Vue.use(ElementUI)

const VCharts = require('v-charts')
Vue.use(VCharts)

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
