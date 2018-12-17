import Vue from 'vue'
import App from './App/App.vue'
import router from './router'
import Vuetify from 'vuetify'
import 'vuetify/dist/vuetify.min.css'
import VCharts from 'v-charts'


Vue.use(Vuetify, {
  theme: {
    primary: '#3f51b5',
    secondary: '#b0bec5',
    accent: '#8c9eff',
    error: '#b71c1c'
  }
})

Vue.use(VCharts)

// import {observable, isObservable, toJS} from 'mobx'
// import VueMobx from 'vue-mobx'
// Vue.use(VueMobx, {
//     toJS: toJS, // must
//     isObservable: isObservable, // must
//     observable: observable,  // optional
// });


// import Movue from 'movue'
// import * as mobx from 'mobx'
// Vue.use(Movue, mobx)


Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
